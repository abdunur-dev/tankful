# Budget study protocol

This is separate from the extension unit tests. No synthetic scorer fixture is a study run.

Freeze ten randomized, interleaved repetitions of each condition on each of two
models (80 runs). A is the 14,000-token eve hard limit alone. B adds default Tankful
and guards `search_docs`; C does the same with `lowAt: 0.50, criticalAt: 0.25`.
D is A with exactly one additional prompt line: “You have about 14,000 tokens. Stop and
write a Budget note before you run out.” Otherwise keep the task, including the requested
note and output format, identical. D's prompt tokens count toward usage, not Tankful overhead.
Cost decision made before calibration or scoring: Groq lists input/output per million at
$0.075/$0.30 (20B) and $0.15/$0.60 (120B). At 14,000 tokens × 40 runs per model,
even pricing every token as output gives $0.504 nominal; doubling that allowance gives
$1.008. These are planning scenarios, not bills or guarantees. No outcome-based expansion.
Sources: https://console.groq.com/docs/model/openai/gpt-oss-20b and
https://console.groq.com/docs/model/openai/gpt-oss-120b.

`study/task.json` and `study/fixture.mjs` define the prompt and all eight synthetic
archive documents. Each includes a short fact and a 1,200-entry serial ledger.
Deliver the full tool payload to the model, including the ledger. No other research
tools, subagents, automatic continuations, summary/truncation of the current result,
or access to fixture files. Reject parallel advancement from the same model response.
`study/order.json` is the authoritative scored order and manual-review selection.
Do not schedule anything from `calibration/`. Before scoring, verify both provider
calibrations deliver the full ledger and debit real usage against the eve limit.
Missing credentials, stripped results or missing usage are blockers, not passes.

For each of eight topics ask for one `Topic: key fact.` line, using a short fact from the
returned document, followed by `Budget note: completed <topics>; skipped <topics>.`
Use a frozen local corpus with sequential lookups. Key facts must be in the actual tool
return. The scorer matches the entire fact (ignoring case, whitespace and final punctuation)
so a matching keyword cannot excuse an invented clause. Unmatched lines are **flags**,
not proof of hallucination; valid paraphrases can be flagged. Empty output has zero claims
and zero completed topics, not a perfect grounding score.

Before viewing scores, select ten saved runs for manual review with a fixed seed:
one per model/condition cell, plus two distinct remaining runs. Compare each summary
with that run's raw tool output; record unsupported assertions and false positives or
negatives separately from the automated score. Preserve every original transcript.

Offline checks: `node --test eval/score.test.mjs`.
Rescore: `node eval/score.mjs TASK.json RUN.json [RUN.json ...]`.
`TASK.json` supplies `topics` and `limit`. The run record holds the final answer and finish
reason, successful/failed tool calls and their returned key facts, per-response provider
usage, whether usage is complete, and counted guidance tokens by request (null if unknown).
Keep original event logs and native Tankful reports alongside those records.

Results must state that B and C change **both guidance and tool gating** relative to A;
neither isolates the effect of guidance. Report model/condition sample sizes and spread,
including worse outcomes. Place this sentence next to the results: **This is an artificial
task with a local corpus and forced sequential lookups, not a general agent benchmark.**
