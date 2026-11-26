# V2 runtime estimate, not a run authorization

**Recommendation:** keep the current tier for the eight unscored calibrations if its daily headroom is sufficient. Only consider paying for throughput once the [calibration gates](CALIBRATION.md) pass and the daily quota is known. This proposal enables no calls, makes no billing change and does not select a policy for scoring.

## One fixed pacing rule across all cells

Serialize all provider attempts. On the observed 8,000 TPM tier, wait until at least **65 seconds after the previous attempt started**, including across models and turn boundaries. This is not an extra 65-second sleep after the reply. Keep one global clock, never overlap requests, and never accelerate a cell that uses fewer tokens. Preserve the scored order; if a planned quota break is necessary, pause between turns and resume at the next assigned slot, not with a cheaper condition. Start with available quota, no competing org traffic, adequate daily headroom for a complete turn, and the same published policy in every cell.

This leaves more than a minute between starts; it does not make an individual request estimated above 8,000 tokens admissible, refill a daily bucket, or guarantee that an organization uses a particular window algorithm. Record starts, actual spend and provider limit/reset fields. Stop on a rejection; do not retry or drop a failed slot. Predeclare a transport-only **20-minute per-turn wall timeout** in place of the v1 launcher's two minutes before running a paced series. Do not alter model output limits, sampling, guidance or the 14,000-token budget to make the transport work.

## Active time for 80 scored runs

Five to eight accepted decisions per run is a fixture design target, not a measured v2 distribution. Assuming one request per decision, no failures, and local setup fitting within the gaps, the span from first to last request start is `(80 × decisions − 1) × interval`. Add initial setup, last response, any work exceeding a slot and any quota waits. The same interval applies to all four conditions on both models.

| Decisions/run | Requests | Current: 65 s | Higher-quota illustration: 21 s |
| ---: | ---: | ---: | ---: |
| 5 | 400 | 7.20 h | 2.33 h |
| 7 | 560 | 10.09 h | 3.26 h |
| 8 | 640 | 11.54 h | 3.73 h |

The eight calibrations are **extra**: 40–64 requests, about 42–68 active minutes at 65 s, or 14–22 minutes at 21 s. Early stops reduce call count; longer turns increase it. There is no measured end-to-end v2 runtime yet.

## What an upgrade would and would not buy

- At a nominal 14,000 quota-charged tokens per run, the scored sample uses **1.12M** (560K/model). With one fully available shared allowance the *throughput alone* would take 140 minutes at 8K TPM, or 37.3 minutes at **hypothetical** 30K TPM. Neither is a wall-clock forecast: turns may stop early or overshoot, and quota-charged tokens can differ from eve spend.
- [Groq's public limits table](https://console.groq.com/docs/rate-limits) lists **8K TPM, 200K tokens/day, 30 requests/minute and 1K requests/day** for both frozen models in the displayed 8K rows. Limits apply at organization level; the exact tier, bucket sharing, reset policy, available balance, and separate input/output limits cannot be inferred from the v1 429s. At the nominal spend, two independent 200K daily buckets would each need **three daily allotments**; one shared 200K bucket would need **six**. These are quota volumes, not promises about midnight or elapsed days. A single uninterrupted day is not a safe estimate on that quota.
- The faster column is conditional, **not a quoted paid entitlement**: assume at least 30K usable TPM, at most 8K of admission demand per request, adequate RPM and daily capacity, and no competing traffic. Three starts in any 60 s at 21 s spacing would then request at most 24K. Changing tier while keeping the 65 s rule does not shorten active time; it may remove daily waits. Verify the organization's actual limits before proposing a shorter interval. If a change is approved, register one interval for the whole scored sample, not different speeds by condition or mid-sample.

After calibration, use the observed decision counts, largest admission demand, local setup times, and actual daily headroom to revise **only this estimate**. Do not claim study results or start the scored sample.
