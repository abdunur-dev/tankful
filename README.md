# Tankful

> eve can cut an agent off at a limit. Tankful lets the agent see its tank and plan around it.

The budget is soft, since a call can't be stopped midway, so pair it with `eve`'s `limits.sessionUsage`. Tested on one real model (Groq `gpt-oss-120b`) over N runs.

## Setup

Follow these steps in order:

1. **Install**:

```bash
npm install tankful
```

2. **Mount `agent/extensions/tankful.ts`**:

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

Recommended minimum `limit`: **at least `10_000` tokens** (or `2–3×` your average call cost) so the agent can complete multiple steps before hitting the default `4500`-token final-answer reserve.

3. **(Optional) Wrap tools with `tankful/guard`**:

`tankful/guard` reads state from the mounted `tankful` extension, so `agent/extensions/tankful.ts` **must be mounted first**.

```ts
import { defineTool } from "eve/tools";
import { whenBudgetAllows } from "tankful/guard";

export default whenBudgetAllows(defineTool({ /* ... */ }));
```

### `whenBudgetAllows` options

- **`reserve`** (number): Minimum tokens to reserve for the final answer. Tools are hidden when `remaining < reserve`. Defaults to `1.5 × average call cost` seen in the session (`4500` tokens before any call).
- **`disableAt`** (`"low" | "critical" | "empty"`): Alternative or additional level threshold at or below which the tool is hidden (for example, `{ disableAt: "critical" }`).

## How it works

1. **Per-turn (per-task) budget**: Tankful resets its fuel tank on every `turn.started` event (while keeping the previous turn's `lastReport` and session average tokens/call), so each user request/task starts with a full tank.
2. **Tracks token usage (`used`)**: Listens to `usage.recorded` hook events and sums `inputTokens + outputTokens`. Because `eve`'s `Usage.inputTokens` already includes `cacheReadTokens` and `cacheWriteTokens`, cached tokens are included in `used` (not subtracted). While a call is in-flight (or if `usage.recorded` is missing), Tankful estimates from the previous call's token count or ~4 chars/token and marks `estimated: true`.
3. **Exposes `tankful__check_tank`**: A tool the agent can call anytime to inspect `{ limit, used, remaining, percentLeft, level, steps, completedCalls, estimated, loopDetected }`.
4. **Adapts via dynamic instructions**: Before every model call, `defineDynamic` injects budget guidance (`role: "system"` at `ok`/`low`, `role: "user"` at `critical`/`empty` or when `reserve` is reached) and a start-of-turn plan hint:
   - `ok` (> 30% left): Work thoroughly and use tools as needed.
   - `low` (<= 30% left): Keep answers short and skip optional work.
   - `critical` (<= 10% left): Stop gathering new info, do not call tools, and write your final answer now.
   - `empty` (0 left): Do not start new work or call tools.
5. **Detects loops**: Tracks consecutive identical tool calls (`name + input`), excluding Tankful's own tools (`check_tank` / `tankful__check_tank`). Repeating the same step `loopRepeats` times in a row adds a loop warning.
6. **End-of-run report**: On `turn.settled`, computes and logs `{ limit, used, remaining, steps, completedCalls, toolsHidden, estimated, loopDetected }` and writes `.eve/tankful-last-report.json` with fields `limit`, `used`, `remaining`, `percentLeft`, `level`, `steps`, `completedCalls`, `toolsHidden`, `estimated`, and `loopDetected`. Read it with `cat .eve/tankful-last-report.json` (or `Get-Content .eve\tankful-last-report.json` in PowerShell). There is no option to switch the report file off; it writes on `turn.settled` and skips silently if the directory is read-only.

## Debug logging

Set `TANKFUL_DEBUG=1` in the environment to log `used`, `remaining`, `percentLeft`, `level`, and the exact injected instruction before every model call.

## How it complements `eve` `limits`

`eve`'s built-in `limits.sessionUsage` is **per session** (or per approved continuation window across turns) and acts as a hard circuit breaker that pauses or stops a session once a token or cost threshold is crossed, without giving the model any visibility beforehand. Tankful's budget is **per turn (per task)**—resetting on `turn.started`—and acts as the soft, adaptive layer inside that budget by exposing `check_tank`, steering the model through `ok` / `low` / `critical` / `empty` instructions, and warning on repetitive loops so the agent can wrap up cleanly. Pairing Tankful (e.g. `limit: 50_000` per turn) with `limits.sessionUsage` (e.g. `200_000` per session) gives you per-task graceful degradation plus a session-wide hard runtime safety net.

## Results

| Run | Model | Prompt | Searches made | Budget note correct? | Tokens vs limit |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## Known limits

- **Tankful manages budget, not accuracy**: A model that skips tool calls can still write ungrounded text or omit the `Budget note`.

- **Models may ignore advisory instructions**: Instructions alone are not a hard stop; some models will keep calling tools at `critical` or `empty` unless you wrap host tools with `whenBudgetAllows(...)`.
- **Cutoff hides only wrapped tools**: `eve`'s built-in tools (`bash`, `read_file`, `write_file`, `edit_file`, `web_fetch`, `glob`, `grep`) stay available unless overridden in `agent/tools/<name>.ts` with `whenBudgetAllows(...)` (per `eve`'s built-in tools slot mechanism):
  ```ts
  // agent/tools/bash.ts
  import { bash } from "eve/tools/bash";
  import { whenBudgetAllows } from "tankful/guard";

  export default whenBudgetAllows(bash);
  ```
- **Per-turn scope**: Tankful resets on `turn.started` and does not enforce a multi-turn session cap (use `limits.sessionUsage` for session-wide caps).
- **Post-call accounting**: `usage.recorded` arrives after a model call finishes, so a single large call can overshoot `limit` before the next step sees `level=empty`.
- **Subagent isolation**: Because `defineState` is isolated per session in `eve`, subagents get their own independent state.
