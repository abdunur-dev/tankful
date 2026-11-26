# Amendment 01: Groq assistant replay compatibility

Approved before rerunning the four calibration cells. The original freeze is
`72814a0`; the offline bounds are `630ced5`. The failed pre-amendment 20B/A
attempt is retained in `20b-A-live-attempt-01.zip` (SHA-256
`dbf487a272ce5eff8cf8a87474090c41a3ed829272a4c2d374c7dcf5545f41c3`).
It is neither a scored observation nor a cutoff.

All cells use the **same** `groq-replay.mjs` (SHA-256 of LF source bytes:
`68d7f5fe321a6e51e6fa39513bfb054548f309df690ebf04fc10d60a27ad6c4a`).
The provider rejects `reasoning_content` on replayed assistant messages. Remove
only that top-level field from those messages before saving and sending the
outbound request. No changes to prompt, guidance, tool outputs, provider
responses, recorded usage, cutoffs, fixture, score, or run order.

For every condition this removes reasoning text from replay input, lowering
the input-token load relative to resending that text whenever it is present.
There is no saving on a request without it. The rejected request had no billed
usage with which to measure the counterfactual difference. The 14,400-token
minimum counts **only digits inside six distinct newly delivered tool results**,
not reasoning or any other replayed history. The bound is unchanged.

Offline tests send the same amended payload through the transport for both
models and both calibration conditions, checking exact tool and system/user
guidance content and the unchanged provider usage stream. The retained failed
request was also compared structurally: exactly one assistant field was removed.
