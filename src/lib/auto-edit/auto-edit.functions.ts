/**
 * Public server entry for standalone MOTIO2EDIT Auto.
 * Returns only safe fields — never internal prompts or vision dumps.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStandaloneAutoEdit } from "./auto-edit.executor.server";

const schema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  imageQuality: z.enum(["hd", "2k", "4k"]).default("hd"),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

export const runStandaloneAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    return executeStandaloneAutoEdit({
      imageUrl: data.imageUrl,
      imageQuality: data.imageQuality ?? "hd",
      width: data.width,
      height: data.height,
    });
  });
