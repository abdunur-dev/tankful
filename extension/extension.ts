import { defineExtension } from "eve/extension";
import { z } from "zod";
import { resolveTurnLimit } from "./lib/tank.js";

export default defineExtension({
  config: z
    .object({
      limit: z.number().finite().positive().optional(),
      turnCapTokens: z.number().int().min(2).optional(),
      headroom: z.number().finite().min(0).lt(1).optional(),
      lowAt: z.number().finite().gt(0).lt(1).default(0.3),
      criticalAt: z.number().finite().gte(0).lt(1).default(0.1),
      loopRepeats: z.number().int().min(2).default(3),
    })
    .superRefine((c, ctx) => {
      try {
        resolveTurnLimit(c);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        ctx.addIssue({ code: "custom", message: error.message });
      }
    })
    .refine((c) => c.criticalAt < c.lowAt, {
      message: "criticalAt must be less than lowAt",
      path: ["criticalAt"],
    }),
});
