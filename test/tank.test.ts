import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildTankInstructions,
  createTankReport,
  createTankState,
  estimateTokensFromText,
  formatCallLabel,
  formatTankReport,
  getAvgCallTokens,
  getDefaultReserve,
  getTankStatus,
  recordEstimatedText,
  recordRealUsage,
  recordStep,
  resolveTankConfig,
  shouldAllowTool,
} from "../extension/lib/tank.ts";

describe("tankful core", () => {
  it("starts full with zero usage and ok level", () => {
    const state = createTankState({ limit: 1000 });
    const status = getTankStatus(state);

    assert.equal(status.limit, 1000);
    assert.equal(status.used, 0);
    assert.equal(status.remaining, 1000);
    assert.equal(status.percentLeft, 100);
    assert.equal(status.level, "ok");
    assert.equal(status.steps, 0);
    assert.equal(status.estimated, false);
    assert.equal(status.loopDetected, false);
  });

  it("counts real tokens without marking usage as estimated", () => {
    let state = createTankState({ limit: 1000 });
    state = recordRealUsage(state, { inputTokens: 150, outputTokens: 50 });
    state = recordRealUsage(state, { inputTokens: 100, outputTokens: 100 });

    const status = getTankStatus(state);
    assert.equal(status.used, 400);
    assert.equal(status.remaining, 600);
    assert.equal(status.percentLeft, 60);
    assert.equal(status.level, "ok");
    assert.equal(status.estimated, false);
  });

  it("estimates tokens from text (~4 chars/token) and flags as estimated", () => {
    assert.equal(estimateTokensFromText(""), 0);
    assert.equal(estimateTokensFromText("abcd"), 1);
    assert.equal(estimateTokensFromText("abcde"), 2);

    let state = createTankState({ limit: 100 });
    state = recordEstimatedText(state, "a".repeat(40)); // 10 tokens

    const status = getTankStatus(state);
    assert.equal(status.used, 10);
    assert.equal(status.remaining, 90);
    assert.equal(status.estimated, true);
  });

  it("transitions across ok, low, critical, and empty thresholds", () => {
    const config = { limit: 1000, lowAt: 0.3, criticalAt: 0.1 };

    // > 30% left -> ok
    let state = recordRealUsage(createTankState(config), {
      inputTokens: 699,
      outputTokens: 0,
    });
    assert.equal(getTankStatus(state, config).level, "ok");

    // exactly 30% left -> low
    state = recordRealUsage(createTankState(config), {
      inputTokens: 700,
      outputTokens: 0,
    });
    assert.equal(getTankStatus(state, config).level, "low");

    // 11% left -> low
    state = recordRealUsage(createTankState(config), {
      inputTokens: 890,
      outputTokens: 0,
    });
    assert.equal(getTankStatus(state, config).level, "low");

    // exactly 10% left -> critical
    state = recordRealUsage(createTankState(config), {
      inputTokens: 900,
      outputTokens: 0,
    });
    assert.equal(getTankStatus(state, config).level, "critical");

    // 0% left -> empty
    state = recordRealUsage(createTankState(config), {
      inputTokens: 1000,
      outputTokens: 0,
    });
    assert.equal(getTankStatus(state, config).level, "empty");
  });

  it("never lets remaining or percentLeft go negative", () => {
    let state = createTankState({ limit: 100 });
    state = recordRealUsage(state, { inputTokens: 250, outputTokens: 50 });

    const status = getTankStatus(state);
    assert.equal(status.used, 300);
    assert.equal(status.remaining, 0);
    assert.equal(status.percentLeft, 0);
    assert.equal(status.level, "empty");
  });

  it("detects loops only when the same step repeats N times in a row", () => {
    const config = { limit: 1000, loopRepeats: 3 };
    let state = createTankState(config);

    // Non-consecutive repeats should not trigger loop
    state = recordStep(state, "search:a", config);
    state = recordStep(state, "search:a", config);
    state = recordStep(state, "search:b", config);
    state = recordStep(state, "search:a", config);
    assert.equal(state.loopDetected, false);
    assert.equal(state.steps, 4);

    // 2 more of search:a makes 3 in a row -> triggers loop
    state = recordStep(state, "search:a", config);
    assert.equal(state.loopDetected, false);
    state = recordStep(state, "search:a", config);
    assert.equal(state.loopDetected, true);
    assert.equal(state.steps, 6);
  });

  it("excludes Tankful tools from loop detection", () => {
    const config = { limit: 1000, loopRepeats: 3 };
    let state = createTankState(config);

    // Repeating check_tank (or mounted tankful__check_tank) never triggers a loop
    state = recordStep(state, "tankful__check_tank:{}", config);
    state = recordStep(state, "tankful__check_tank:{}", config);
    state = recordStep(state, "tankful__check_tank:{}", config);
    state = recordStep(state, "check_tank:{}", config);
    assert.equal(state.loopDetected, false);
    assert.equal(state.steps, 4);

    // A non-Tankful tool repeated 3 times in a row still triggers loop detection
    state = recordStep(state, 'search_docs:{"query":"budget"}', config);
    state = recordStep(state, 'search_docs:{"query":"budget"}', config);
    state = recordStep(state, 'search_docs:{"query":"budget"}', config);
    assert.equal(state.loopDetected, true);
    assert.equal(state.steps, 7);
  });

  it("produces distinct guidance per level, start-of-turn plan, rules, and loop warning", () => {
    assert.equal(getAvgCallTokens(0, 0), 3000);
    assert.equal(getAvgCallTokens(2, 5000), 2500);

    // Start-of-turn (used === 0 or steps === 0) includes plan-within-budget hint
    const startMsg = buildTankInstructions({
      limit: 8000,
      used: 0,
      remaining: 8000,
      percentLeft: 100,
      level: "ok",
      steps: 0,
      estimated: false,
      loopDetected: false,
    });
    assert.match(startMsg, /Plan within your 8000-token budget \(~3000 tokens\/call, ~2 calls fit\)/);
    assert.match(startMsg, /Use only what tool results actually say\./);
    assert.match(startMsg, /Budget note: completed <list>; skipped <list>\./);

    // Custom session average
    const customAvgMsg = buildTankInstructions(
      {
        limit: 9000,
        used: 1000,
        remaining: 8000,
        percentLeft: 88.89,
        level: "ok",
        steps: 0,
        estimated: false,
        loopDetected: false,
      },
      1500,
    );
    assert.match(customAvgMsg, /~1500 tokens\/call, ~6 calls fit/);

    const okMsg = buildTankInstructions(
      {
        limit: 1000,
        used: 100,
        remaining: 900,
        percentLeft: 90,
        level: "ok",
        steps: 1,
        estimated: false,
        loopDetected: false,
      },
      100,
    );
    assert.match(okMsg, /level=ok/);
    assert.match(okMsg, /Work thoroughly/i);
    assert.doesNotMatch(okMsg, /Plan within/);
    assert.match(okMsg, /Budget note: completed <list>; skipped <list>\./);
    assert.doesNotMatch(okMsg, /Loop detected/i);

    const lowMsg = buildTankInstructions(
      {
        limit: 1000,
        used: 750,
        remaining: 250,
        percentLeft: 25,
        level: "low",
        steps: 2,
        estimated: true,
        loopDetected: false,
      },
      100,
    );
    assert.match(lowMsg, /level=low, estimated/);
    assert.match(lowMsg, /Keep answers short/i);
    assert.match(lowMsg, /Budget note: completed <list>; skipped <list>\./);

    const criticalMsg = buildTankInstructions({
      limit: 1000,
      used: 950,
      remaining: 50,
      percentLeft: 5,
      level: "critical",
      steps: 3,
      estimated: false,
      loopDetected: true,
    });
    assert.match(criticalMsg, /level=critical/);
    assert.match(criticalMsg, /Stop gathering new info/i);
    assert.match(criticalMsg, /Budget note: completed <list>; skipped <list>\./);
    assert.match(criticalMsg, /Loop detected/i);

    const emptyMsg = buildTankInstructions({
      limit: 1000,
      used: 1000,
      remaining: 0,
      percentLeft: 0,
      level: "empty",
      steps: 4,
      estimated: false,
      loopDetected: false,
    });
    assert.match(emptyMsg, /level=empty/);
    assert.match(emptyMsg, /Do not start new work/i);
    assert.match(emptyMsg, /Budget note: completed <list>; skipped <list>\./);
  });

  it("rejects invalid limits and thresholds", () => {
    assert.throws(() => resolveTankConfig({ limit: 0 }), /limit/i);
    assert.throws(() => resolveTankConfig({ limit: -50 }), /limit/i);
    assert.throws(() => resolveTankConfig({ limit: Number.NaN }), /limit/i);
    assert.throws(() => resolveTankConfig({ limit: Number.POSITIVE_INFINITY }), /limit/i);
    assert.throws(() => resolveTankConfig({ limit: 100, lowAt: 1 }), /lowAt/i);
    assert.throws(
      () => resolveTankConfig({ limit: 100, lowAt: 0.2, criticalAt: 0.3 }),
      /criticalAt/i,
    );
    assert.throws(() => resolveTankConfig({ limit: 100, loopRepeats: 1 }), /loopRepeats/i);
  });

  it("creates an accurate end-of-run report", () => {
    const config = { limit: 500, loopRepeats: 2 };
    let state = createTankState(config);
    state = recordRealUsage(state, { inputTokens: 200, outputTokens: 100 });
    state = recordEstimatedText(state, "hello world!"); // 12 chars -> 3 tokens
    state = recordStep(state, "read:file", config);
    state = recordStep(state, "read:file", config);

    const report = createTankReport(state, config);
    assert.deepEqual(report, {
      limit: 500,
      used: 303,
      remaining: 197,
      percentLeft: 39.4,
      level: "ok",
      steps: 2,
      estimated: true,
      loopDetected: true,
    });

    const formatted = formatTankReport(report);
    assert.match(formatted, /limit=500/);
    assert.match(formatted, /used=303/);
    assert.match(formatted, /remaining=197/);
    assert.match(formatted, /steps=2/);
    assert.match(formatted, /estimated=true/);
    assert.match(formatted, /loopDetected=true/);
  });

  it("estimates in-flight call from lastCallTokens and reconciles when usage.recorded arrives", () => {
    const config = { limit: 8000 };
    let state = createTankState(config);

    // Call 0 settles with real usage of 3115 tokens
    state = recordRealUsage(state, { inputTokens: 2991, outputTokens: 124 });
    assert.equal(state.lastCallTokens, 3115);
    assert.equal(getTankStatus(state, config).used, 3115);
    assert.equal(getTankStatus(state, config).estimated, false);

    // Call 1 starts (in-flight): check_tank includes lastCallTokens estimate instead of undercounting
    state = { ...state, inFlightEstimated: state.lastCallTokens };
    const midCallStatus = getTankStatus(state, config);
    assert.equal(midCallStatus.used, 6230);
    assert.equal(midCallStatus.remaining, 1770);
    assert.equal(midCallStatus.level, "low");
    assert.equal(midCallStatus.estimated, true);

    // Call 1 usage.recorded arrives (3227 tokens), replacing in-flight estimate
    state = recordRealUsage(state, { inputTokens: 3171, outputTokens: 56 });
    const settledStatus = getTankStatus(state, config);
    assert.equal(settledStatus.used, 6342);
    assert.equal(settledStatus.remaining, 1658);
    assert.equal(settledStatus.level, "low");
    assert.equal(settledStatus.estimated, false);
  });

  it("controls tool availability via shouldAllowTool with reserve and disableAt", () => {
    assert.equal(getDefaultReserve(), 4500);
    assert.equal(getDefaultReserve(3200), 4800);

    // Default reserve = 1.5 * avgCallTokens (4500 before any call)
    assert.equal(shouldAllowTool({ level: "ok", remaining: 5000 }), true);
    assert.equal(shouldAllowTool({ level: "ok", remaining: 4499 }), false);
    assert.equal(shouldAllowTool({ level: "ok", remaining: 4700 }, undefined, 3200), false);
    assert.equal(shouldAllowTool({ level: "ok", remaining: 4800 }, undefined, 3200), true);

    // Explicit reserve
    assert.equal(shouldAllowTool({ level: "low", remaining: 200 }, { reserve: 150 }), true);
    assert.equal(shouldAllowTool({ level: "critical", remaining: 100 }, { reserve: 150 }), false);

    // Explicit disableAt (without reserve)
    assert.equal(shouldAllowTool({ level: "low", remaining: 250 }, { disableAt: "critical" }), true);
    assert.equal(shouldAllowTool({ level: "critical", remaining: 100 }, { disableAt: "critical" }), false);

    // String-form backwards compatibility
    assert.equal(shouldAllowTool("ok"), true);
    assert.equal(shouldAllowTool("critical"), false);
  });

  it("grounds low/critical/empty instructions with completed tool calls", () => {
    const config = { limit: 1000 };
    let state = createTankState(config);
    state = recordRealUsage(state, { inputTokens: 750, outputTokens: 0 });
    state = recordStep(
      state,
      'search_docs:{"query":"usage tracking"}',
      config,
      formatCallLabel("search_docs", { query: "usage tracking" }),
    );
    state = recordStep(
      state,
      "tankful__check_tank:{}",
      config,
      formatCallLabel("tankful__check_tank", {}),
    );

    const status = getTankStatus(state, config);
    assert.deepEqual(status.completedCalls, ["search_docs(usage tracking)"]);
    const msg = buildTankInstructions(status);
    assert.match(msg, /Tool calls completed this turn: search_docs\(usage tracking\)\./);
    assert.match(msg, /Never write 'skipped none' unless every requested item has a completed tool call\./);
  });
});
