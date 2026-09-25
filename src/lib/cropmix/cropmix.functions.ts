/**
 * Cropmix AI+ collage — one server endpoint.
 * Price fixed at CROPMIX_AI_PLUS_CREDITS; charge only on success.
 * Uses per-cell fit/fill/offset/zoom to match client preview.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import {
  CROPMIX_AI_PLUS_CREDITS,
  CROPMIX_TIMEOUT_MS,
  type CollageStyleId,
} from "@/lib/cropmix/types";
import { getStyleById, isValidStyleId } from "@/lib/cropmix/styles";
import { canvasSizeForRatio } from "@/lib/cropmix/collage-layout";

const cellSchema = z.object({
  fit: z.enum(["fit", "fill"]).default("fill"),
  offsetX: z.number().min(-1).max(1).default(0),
  offsetY: z.number().min(-1).max(1).default(0),
  zoom: z.number().min(0.25).max(4).default(1),
});

const generateSchema = z.object({
  styleId: z.string().min(1).max(40),
  photoUrls: z.array(z.string().url().or(z.string().startsWith("data:"))).min(1).max(10),
  ratio: z
    .enum(["original", "1:1", "4:5", "3:4", "4:3", "9:16", "16:9"])
    .default("1:1"),
  customize: z
    .object({
      gutter: z.number().optional(),
      border: z.number().optional(),
      cornerRadius: z.number().optional(),
      background: z.string().optional(),
      safeZones: z.boolean().optional(),
    })
    .optional(),
  cells: z.array(cellSchema).optional(),
});

async function extractCell(
  sharp: typeof import("sharp"),
  buf: Buffer,
  rw: number,
  rh: number,
  fit: "fit" | "fill",
  offsetX: number,
  offsetY: number,
  zoom: number,
): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const iw = meta.width || 1;
  const ih = meta.height || 1;
  const z = Math.max(0.25, Math.min(4, zoom || 1));
  const scale =
    fit === "fit"
      ? Math.min(rw / iw, rh / ih) * z
      : Math.max(rw / iw, rh / ih) * z;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (rw - dw) / 2 + offsetX * rw;
  const oy = (rh - dh) / 2 + offsetY * rh;

  const resized = await sharp(buf)
    .resize(Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)), {
      fit: "fill",
    })
    .png()
    .toBuffer();

  const left = Math.round(ox);
  const top = Math.round(oy);

  return sharp({
    create: {
      width: Math.max(1, rw),
      height: Math.max(1, rh),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

export const generateCropmixCollage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const started = Date.now();

    if (!isValidStyleId(data.styleId)) {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: "Invalid style.",
      };
    }
    const style = getStyleById(data.styleId)!;
    if (style.tier !== "ai_plus") {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: "This style does not require the AI+ endpoint.",
      };
    }
    const n = data.photoUrls.length;
    if (n < style.cellCount.min || n > style.cellCount.max) {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: `Style requires ${style.cellCount.min}–${style.cellCount.max} photos.`,
      };
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("credits, email, plan")
      .eq("id", userId)
      .single();
    if (pErr || !profile) {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: "Could not load your account.",
      };
    }

    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    const cost = CROPMIX_AI_PLUS_CREDITS;

    if (!isAdmin && profile.credits < cost) {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: `Not enough credits. AI+ collage costs ${cost} credits.`,
      };
    }

    if (Date.now() - started > CROPMIX_TIMEOUT_MS) {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: "Timed out before processing.",
      };
    }

    let dataUrl: string | null = null;
    let width = 0;
    let height = 0;

    try {
      const { width: cw, height: ch } = canvasSizeForRatio(
        data.ratio === "original" ? "1:1" : data.ratio,
        1080,
      );
      width = cw;
      height = ch;

      let sharpMod: { default: typeof import("sharp") } | null = null;
      try {
        sharpMod = await import("sharp");
      } catch {
        sharpMod = null;
      }

      if (!sharpMod) {
        return {
          dataUrl: null as string | null,
          width: 0,
          height: 0,
          creditsCharged: 0,
          error:
            "Server image engine unavailable. Try a Common style, or retry later.",
        };
      }
      const sharp = sharpMod.default;

      const { getLayoutRects } = await import("@/lib/cropmix/collage-layout");
      const { buildCropmixWatermarkSvg } = await import(
        "@/lib/cropmix/watermark"
      );
      const rects = getLayoutRects(
        data.styleId as CollageStyleId,
        n,
        data.customize,
      );
      const bg = data.customize?.background ?? style.defaults.background ?? "#0B0B18";

      const composites: { input: Buffer; left: number; top: number }[] = [];
      for (let i = 0; i < n; i++) {
        const rect = rects[i];
        if (!rect) continue;
        const url = data.photoUrls[i];
        let buf: Buffer;
        if (url.startsWith("data:")) {
          const b64 = url.split(",")[1] ?? "";
          buf = Buffer.from(b64, "base64");
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Photo ${i + 1} fetch failed`);
          buf = Buffer.from(await res.arrayBuffer());
        }
        const rw = Math.max(1, Math.round(rect.w * cw));
        const rh = Math.max(1, Math.round(rect.h * ch));
        const rx = Math.round(rect.x * cw);
        const ry = Math.round(rect.y * ch);
        const cell = data.cells?.[i] ?? {
          fit: "fill" as const,
          offsetX: 0,
          offsetY: 0,
          zoom: 1,
        };
        const fitted = await extractCell(
          sharp,
          buf,
          rw,
          rh,
          cell.fit,
          cell.offsetX,
          cell.offsetY,
          cell.zoom,
        );
        composites.push({ input: fitted, left: rx, top: ry });
      }

      const wmSvg = buildCropmixWatermarkSvg(cw, ch);
      composites.push({
        input: Buffer.from(wmSvg),
        left: 0,
        top: 0,
      });

      const out = await sharp({
        create: {
          width: cw,
          height: ch,
          channels: 4,
          background: bg,
        },
      })
        .composite(composites)
        .jpeg({ quality: 92 })
        .toBuffer();
      dataUrl = `data:image/jpeg;base64,${out.toString("base64")}`;
    } catch (e) {
      console.error("[cropmix] compose failed", e);
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error:
          e instanceof Error
            ? e.message
            : "Composition failed. No credits charged.",
      };
    }

    if (!dataUrl) {
      return {
        dataUrl: null as string | null,
        width: 0,
        height: 0,
        creditsCharged: 0,
        error: "Empty result. No credits charged.",
      };
    }

    let creditsCharged = 0;
    let newCredits = profile.credits;
    if (!isAdmin) {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc(
        "deduct_credits",
        {
          _amount: cost,
          _gen_type: "image",
          _user_id: userId,
        },
      );
      if (dErr || !deduction) {
        console.error("[cropmix] deduct failed after compose", dErr);
        return {
          dataUrl,
          width,
          height,
          creditsCharged: 0,
          error: null as string | null,
        };
      }
      creditsCharged = cost;
      newCredits = (deduction as { credits: number }).credits;
    }

    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "image",
        prompt: `Cropmix · ${style.name}`,
        output_url: null,
        credits_used: creditsCharged,
        metadata: {
          source: "cropmix",
          experience: "cropmix-collage",
          style_id: data.styleId,
          ratio: data.ratio,
          photo_count: n,
          credits_charged: creditsCharged,
        },
      });
    } catch (e) {
      console.error("[cropmix] history insert failed", e);
    }

    return {
      dataUrl,
      width,
      height,
      creditsCharged,
      credits: newCredits,
      error: null as string | null,
    };
  });
