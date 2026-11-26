# V2 calibration: pass or stop

Registered after the [v2 freeze](https://github.com/abdunur-dev/tankful/blob/5cc1e96d05700ff31dddbf7027defdf97ecc361f/eval/v2/FREEZE.md), before any v2 provider request. This is a test of the apparatus and whether the model gets an opportunity to act on different guidance. It does not require that Tankful win. It is not authorization to run.

## Sample and controls

If separately approved, use one fresh, unscored turn per cell: 20B A, B, C, D; then 120B A, B, C, D. Use `v2-cal-<model-size>-<condition>-01` IDs and `phase: calibration`, never IDs from `order.json`. No warm-ups, replacements, hidden retries, second turns, forced lookups or extra calls to solicit a final answer. Keep failures. The 80 scored slots and ten review selections stay untouched.

Before the first call, pin the runner revision and pacing policy for **all eight** cells. Verify offline that the runner uses the [v2 task](task.json), 140-serial pages, the frozen Groq replay adapter, original model settings and eve's 14,000 combined input/output limit. Test all four configurations, including the prompt, tool guard, request pacing across turns and failure path. The v1 launcher is not a v2 launcher.

## Evidence required in every cell

- Save a redacted per-attempt trace: model, condition, IDs, times, actual outbound messages and tool schemas, HTTP status, response/usage, safe rate-limit/reset or `retry-after` fields if returned, eve events, lookup results, actual final text (including empty), finish reason and turn status. B/C: preserve native report if emitted; record absence rather than making one. A/D have no native Tankful report. Never archive credentials or the full HTTP headers.
- At least one `search_docs` success per cell must reach a subsequent **accepted model decision**: a provider response with successful status, a completed model response and real usage. Match the tool-call ID and the entire returned page against the fixture. For every later request, verify every prior successful lookup is still present intact. If the last lookup had no subsequent request because eve stopped, label it *returned, never delivered*, not truncated or read by the model. No compaction, summarization, parallel cursor advancement or hidden fixture access.
- Match each provider input/output pair to its eve usage event, then compare totals. Count billed attempts once, including any billed retry; do not add cached or reasoning token subtotals a second time. Any unexpected retry, unknown usage on a possibly billed attempt, mismatch, provider rejection, timeout or lost trace invalidates the calibration. A 429 is not an eve budget stop. Stop the series on an infrastructure failure; mark remaining cells unattempted.
- Build a decision table from the actual requests: request index, pages delivered, cumulative settled spend **before** and **after**, latest effective guidance level and role (or none), tool availability and resulting action. Distinguish newly rendered guidance from replay of an earlier user-role instruction. Debug output can identify the current instruction but cannot prove the provider received it. Record actual decision counts; five to eight is a planning target, not a reason to extend a turn.

## Binary pass criteria

The following cell checks must hold **on each model**, independently:

| Cell | Required observation |
| --- | --- |
| A: hard limit alone | No Tankful guidance, guard or static reminder. Either eve exhausts the 14,000-token budget (verified by reconciled spend and the stop event/reason), or the model returns a final answer with at least one topic line supported by its delivered page. Record the limit and final-answer observations separately. |
| B: default Tankful | Guard `search_docs`; use `lowAt: 0.30`, `criticalAt: 0.10`. An accepted decision receives current `low` guidance; a **later, distinct** accepted decision receives current `critical` guidance. A retained low message alongside a newly critical one is not two decisions. |
| C: earlier thresholds | Same guard as B, with `lowAt: 0.50`, `criticalAt: 0.25`. Find at least one pair of accepted B/C decisions on this model with the same number and order of delivered pages, where C actually received a more urgent current level than B. To attribute the difference to the thresholds rather than spend alone, applying B's thresholds to C's own exact remaining fraction must also give a less urgent level. Compare `ok < low < critical < empty`; differing token counts or wording alone do not qualify. |
| D: static reminder | Run A's setup with exactly `D_extra_line` appended once to the initial prompt, no Tankful guidance, tools or guard. The reminder must reach an accepted request. The turn must end by a real model final response or verified eve budget exhaustion, not by a provider rejection. |

**Across the eight turns:** at least one must return a real final answer with a supported topic line on a response that starts below 14,000 and takes reconciled spend to **at least 14,000**. The answer must be present in the saved turn, not reconstructed from reasoning, tool calls or a pause. No further provider call is allowed after exhaustion. Report the authentic Budget note and whether its lists match the lookups, or report it missing/incorrect. A final answer and an eve pause are separate observations; a pause by itself is never a final answer.

**Decision:** PASS only if all evidence checks, both models' A/B/C/D checks and the cross-turn check pass. Otherwise record FAIL (or INCOMPLETE for unattempted cells), the request IDs supporting the decision, and stop. Publish no performance claims. No retuning, selective reruns, pooling with v1, or automatic move to scoring. Any proposed amendment must be dated and approved before further calls; even a pass requires separate approval to start the 80.
