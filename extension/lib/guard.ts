import { defineDynamic } from "eve/tools";

import extension from "../extension.js";
import { tankState } from "./state.js";
import {
  getAvgCallTokens,
  getTankStatus,
  shouldAllowTool,
  type TankLevel,
  type ToolGateOptions,
} from "./tank.js";

export interface WhenBudgetAllowsOptions extends ToolGateOptions {
  /** Minimum tokens to reserve for the final answer (defaults to `1.5 * avgCallTokens`). */
  reserve?: number;
  /** Level at or below which the tool is hidden (alternative or additional gate). */
  disableAt?: TankLevel;
}

/**
 * Wraps a host agent tool definition in `defineDynamic` so it returns `null`
 * (hiding the tool from the model) when remaining tokens drop below `reserve`
 * (default `1.5 * avgCallTokens`, or 4500 before any call) or at `disableAt`.
 */
export function whenBudgetAllows<T>(
  tool: T,
  options?: WhenBudgetAllowsOptions,
) {
  return defineDynamic(() => {
    const state = tankState.get();
    const status = getTankStatus(state, extension.config);
    const avgCallTokens = getAvgCallTokens(
      state.sessionUsageCount,
      state.sessionTotalTokens,
    );
    return shouldAllowTool(status, options, avgCallTokens)
      ? (tool as never)
      : null;
  });
}
