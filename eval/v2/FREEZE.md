# Tankful budget study: v2 freeze

**Decision:** use 140 serials per ledger instead of 1,200. This choice was
made from v1 calibration cost data, with **no scored results seen**. Keep v1
as a separate preregistration, not an earlier batch of v2 observations.

**Why:** all four amended v1 calibrations stopped at a provider 429 on the
third request. They did not establish a behavioral tie. With intact replay,
the digits and spaces in one, two, then three v1 ledgers alone cost at least
21,594 cumulative input tokens. At most two topics could be both retrieved
and summarized within 14,000. On the observed B trajectories the early
decisions were `ok`, leaving at most one plausible late threshold decision
on the advancing lookup path. This is insufficient to separate B and C reliably.

**Only intervention changed in the research task:** retain the first 140
serials of each original page; preserve its topic, key fact, cursor, serial
starting value and lookup protocol. Eight sequential lookups are still too
large to summarize within budget: replay of the ledgers alone requires at
least (1 + ... + 8) × (280 digit pieces + 139 spaces) = 15,084 input tokens.
Five to eight decisions are a design target, not a measured result.

**Unchanged:** same two model IDs, eight topics, prompt (including D's single
extra line), hard limit of 14,000 input + output, one fresh turn, four
conditions and scoring rules in `../README.md` and `../score.mjs`. B and C
change both guidance and tool gating. No extensions or new caps for A or D.
Do not change the Groq replay adapter. Retain failures and record every attempt.

**Sampling:** 10 repetitions × 2 models × 4 conditions = 80 scored runs.
Use the v2 seed `tankful-operations-v2` and versioned run IDs. Save the new
order and ten manual-review selections before calibration. Keep all calibration
artifacts outside the scored sample. Report mean and spread per cell, including
ties and losses. This artificial task uses a local corpus and forced sequential
lookups; it is not a general agent benchmark.

**Entry points:** `task.json` is the v2 scorer input, `fixture.mjs` is the
agent-facing data/lookup definition, and `order.json` is the scored order.
The boolean `manualReview` marks the ten runs; `manual-review.json` lists their
IDs. `node eval/v2/score.mjs <v2-scored-run.json> [...]` applies the original
scorer after checking artifact provenance. The v1 live launcher is **not**
a v2 entry point. No live run or pacing policy is authorized by this freeze.

**V1 provenance:** original freeze `72814a0`, offline bounds `630ced5`,
Groq amendment and original failed attempt `8969f30`; the four amended
calibrations remain in `../calibration/amendment-01-calibrations.zip`.
