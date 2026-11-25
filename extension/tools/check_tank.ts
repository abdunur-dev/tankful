import { defineTool } from "eve/tools";
import { z } from "zod";

import extension from "../extension.js";
import { tankState } from "../lib/state.js";
import { getTankStatus } from "../lib/tank.js";

export default defineTool({
  description:
    "Check the current token fuel tank: tokens used, remaining, percent left, level, steps, whether usage is estimated, and whether a loop was detected.",
  inputSchema: z.object({}),
  async execute() {
    const state = tankState.get();
    return getTankStatus(state, extension.config);
  },
});
