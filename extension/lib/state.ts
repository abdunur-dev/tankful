import { defineState } from "eve/context";

import extension from "../extension.js";
import { createTankState, type TankState } from "./tank.js";

export interface SessionTankState extends TankState {
  pendingEstimatedByRunId: Record<string, number>;
  settledUsageRunIds: string[];
  activeRunId: string | null;
  unsettledEstimated: boolean;
  sessionUsageCount: number;
  sessionTotalTokens: number;
}

export function createSessionTankState(): SessionTankState {
  return {
    ...createTankState(extension.config),
    pendingEstimatedByRunId: {},
    settledUsageRunIds: [],
    activeRunId: null,
    unsettledEstimated: false,
    sessionUsageCount: 0,
    sessionTotalTokens: 0,
  };
}

export const tankState = defineState<SessionTankState>(
  "tankful.state",
  createSessionTankState,
);
