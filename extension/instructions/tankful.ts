import { defineDynamic, defineInstructions } from "eve/instructions";

import extension from "../extension.js";
import { tankState } from "../lib/state.js";
import {
  buildTankInstructions,
  getAvgCallTokens,
  getDefaultReserve,
  getTankStatus,
} from "../lib/tank.js";

export default defineDynamic(() => {
  const state = tankState.get();
  const status = getTankStatus(state, extension.config);
  const avgCallTokens = getAvgCallTokens(
    state.sessionUsageCount,
    state.sessionTotalTokens,
  );
  const content = buildTankInstructions(status, avgCallTokens);

  if (process.env.TANKFUL_DEBUG === "1") {
    console.info(
      `[tankful:debug] used=${status.used} remaining=${status.remaining} percentLeft=${status.percentLeft}% level=${status.level} instruction=${JSON.stringify(content)}`,
    );
  }

  const reserveReached =
    status.used > 0 && status.remaining < getDefaultReserve(avgCallTokens);
  const role =
    status.level === "critical" || status.level === "empty" || reserveReached
      ? "user"
      : "system";

  return defineInstructions({
    content,
    role,
  });
});
