import { defineExtension } from "eve/extension";
import { z } from "zod";

export default defineExtension({
  config: z
    .object({
      limit: z.number().finite().positive(),
      lowAt: z.number().finite().gt(0).lt(1).default(0.3),
      criticalAt: z.number().finite().gte(0).lt(1).default(0.1),
      loopRepeats: z.number().int().min(2).default(3),
    })
    .refine((c) => c.criticalAt < c.lowAt, {
      message: "criticalAt must be less than lowAt",
      path: ["criticalAt"],
    }),
});
