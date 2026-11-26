// Offline only. Never overwrite a registered order.
import { writeFileSync } from "node:fs";
import { schedule } from "./fixture.mjs";
const rows = schedule();
for (const [name, data] of [
  ["order.json", rows],
  ["manual-review.json", rows.filter(r => r.manualReview).map(r => r.id)],
]) writeFileSync(new URL(name, import.meta.url), JSON.stringify(data, null, 2) + "\n", { flag:"wx" });
