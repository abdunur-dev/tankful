# Tankful

> eve can cut an agent off at a limit. Tankful lets the agent see its tank and plan around it.

## Install

```bash
npm install tankful
```

## Configure

Mount Tankful in your eve agent under `agent/extensions/tankful.ts`:

```ts
import tankful from "tankful";

export default tankful({
  limit: 50_000,
  // Optional defaults:
  // lowAt: 0.3,       // <= 30% remaining -> "low"
  // criticalAt: 0.1,  // <= 10% remaining -> "critical"
  // loopRepeats: 3,   // same step repeated N times in a row -> loop warning
});
```

### Enforce tool cutoff on host tools (optional)

Wrap your own `agent/tools/*.ts` with `whenBudgetAllows` so the host agent hides them early enough to leave room for the final answer:

```ts
import { defineTool } from "eve/tools";
import { whenBudgetAllows } from "tankful/guard";

export default whenBudgetAllows(defineTool({ /* ... */ }));
```

By default, `whenBudgetAllows` hides the tool when `remaining < reserve`, where `reserve` defaults to `1.5 × average call cost` (falling back to `4500` tokens before any call). You can also pass an explicit `{ reserve: 2000 }` or use `{ disableAt: "critical" }` (or `"low"` / `"empty"`) instead.

## How it works

1. **Per-turn (per-task) budget**: Tankful resets its fuel tank on every `turn.started` event (while keeping the previous turn's `lastReport` and session average tokens/call), so each user request/task starts with a full tank.
2. **Tracks token usage (`used`)**: Listens to `usage.recorded` hook events and sums `inputTokens + outputTokens`. Because `eve`'s `Usage.inputTokens` already includes `cacheReadTokens` and `cacheWriteTokens`, cached tokens are included in `used` (not subtracted). While a call is in-flight (or if `usage.recorded` is missing), Tankful estimates from the previous call's token count or ~4 chars/token and marks `estimated: true`.
3. **Exposes `tankful__check_tank`**: A tool the agent can call anytime to inspect `{ limit, used, remaining, percentLeft, level, steps, estimated, loopDetected }`.
4. **Adapts via dynamic instructions**: Before every model call, `defineDynamic` injects budget guidance (`role: "system"` at `ok`/`low`, `role: "user"` at `critical`/`empty`) and a start-of-turn plan hint:
   - `ok` (> 30% left): Work thoroughly and use tools as needed.
   - `low` (<= 30% left): Keep answers short and skip optional work.
   - `critical` (<= 10% left): Stop gathering new info and write your final answer now.
   - `empty` (0 left): Do not start new work.
5. **Detects loops**: Tracks consecutive identical tool calls (`name + input`), excluding Tankful's own tools (`check_tank` / `tankful__check_tank`). Repeating the same step `loopRepeats` times in a row adds a loop warning.
6. **End-of-run report**: On `turn.settled`, computes and logs `{ limit, used, remaining, steps, estimated, loopDetected }`.

## How it complements `eve` `limits`

`eve`'s built-in `limits.sessionUsage` is **per session** (or per approved continuation window across turns) and acts as a hard circuit breaker that pauses or stops a session once a token or cost threshold is crossed, without giving the model any visibility beforehand. Tankful's budget is **per turn (per task)**—resetting on `turn.started`—and acts as the soft, adaptive layer inside that budget by exposing `check_tank`, steering the model through `ok` / `low` / `critical` / `empty` instructions, and warning on repetitive loops so the agent can wrap up cleanly. Pairing Tankful (e.g. `limit: 50_000` per turn) with `limits.sessionUsage` (e.g. `200_000` per session) gives you per-task graceful degradation plus a session-wide hard runtime safety net.

## Known limits

- **Models may ignore advisory instructions**: Instructions alone are not a hard stop; some models will keep calling tools at `critical` or `empty` unless you wrap host tools with `whenBudgetAllows(...)`.
- **Cutoff requires wrapping host tools**: In `eve`, an extension cannot disable tools defined by the host agent. Hard tool cutoff at `critical`/`empty` requires wrapping your `agent/tools/*.ts` with `whenBudgetAllows`.
- **Per-turn scope**: Tankful resets on `turn.started` and does not enforce a multi-turn session cap (use `limits.sessionUsage` for session-wide caps).
- **Post-call accounting**: `usage.recorded` arrives after a model call finishes, so a single large call can overshoot `limit` before the next step sees `level=empty`.
- **Subagent isolation**: Because `defineState` is isolated per session in `eve`, subagents get their own independent state.
