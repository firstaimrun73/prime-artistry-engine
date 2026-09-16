/**
 * Server-only Cloudflare Workers AI client for Motio2edit Filters.
 * Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (never client-exposed).
 *
 * Cost control:
 * - Prefer a single primary model (FLUX.2 klein 4B).
 * - On failure → throw so caller falls back to local NPR (no multi-model cascade).
 * - Input long-edge capped at ~1024 by the caller.
 */
const AI_BASE = "https://api.cloudflare.com/client/v4/accounts";

/** Primary model only — no expensive multi-model waterfall. */
export const AI_PLUS_PRIMARY_MODEL =
  "@cf/black-forest-labs/flux-2-klein-4b" as const;

export type AiPlusStyleKey =
  | "sketch"
  | "oil"
  | "watercolor"
  | "cartoon"
  | "comic"
  | "anime"
  | "ghibli"
  | "rangoli"
  | "retro3d";

const STYLE_PROMPTS: Record<
  AiPlusStyleKey,
  { prompt: string; negative: string; strength: number }
> = {
  sketch: {
    prompt:
      "transform this entire photograph into a detailed hand-drawn graphite pencil sketch on textured paper, strong natural ink contours with variable line weight, cross-hatching in shadows, controlled shading, full-frame illustration, preserve composition and subject structure, high detail line work, no photographic texture remaining",
    negative:
      "color photo, photorealistic, blurry, watermark, text, logo, low detail, blank areas, soft focus, grayscale overlay only",
    strength: 0.75,
  },
  oil: {
    prompt:
      "transform this entire photograph into a rich classical oil painting with visible thick brush strokes, impasto texture, painterly color mixing, soft blended edges, full-frame painted surface, preserve composition and subject identity, no photographic sharpness remaining",
    negative:
      "photograph, photo, digital, sharp photo edges, watermark, text, logo, smooth plastic skin, simple blur",
    strength: 0.72,
  },
  watercolor: {
    prompt:
      "transform this entire photograph into a soft watercolor painting, pigment bleeds, paper texture, gentle washes, soft edges, full-frame watercolor, preserve composition",
    negative: "photograph, hard edges, plastic, watermark, text, logo",
    strength: 0.68,
  },
  cartoon: {
    prompt:
      "transform this entire photograph into a bold cartoon illustration, cel-shaded flat colors, clean thick black outlines, simplified shapes, full-frame cartoon style, preserve subject identity",
    negative: "photorealistic, photo, grain, watermark, text, logo, muddy colors",
    strength: 0.72,
  },
  comic: {
    prompt:
      "transform this entire photograph into a comic book illustration, bold ink outlines, halftone shading, dramatic contrast, saturated panel style, full-frame comic art, preserve composition",
    negative: "photorealistic, soft photo, watermark, text, logo, blurry",
    strength: 0.74,
  },
  anime: {
    prompt:
      "transform this entire photograph into a clean anime illustration style, soft cel shading, crisp line art, expressive but recognizable subject, full-frame anime look",
    negative: "photorealistic, 3d render, watermark, text, logo",
    strength: 0.7,
  },
  ghibli: {
    prompt:
      "transform this entire photograph into a warm original hand-painted storybook animation frame, soft painterly landscapes, gentle sunlight, whimsical illustrated atmosphere, soft edges on vegetation and sky, full-frame painted look, preserve composition and subject identity, original style not copying any franchise or copyrighted characters",
    negative:
      "photorealistic, photo, watermark, text, logo, dark horror, harsh contrast, studio ghibli logo, known character faces",
    strength: 0.74,
  },
  rangoli: {
    prompt:
      "transform this entire photograph into an elaborate colorful Rangoli-inspired decorative art interpretation, vibrant ornamental geometry, intricate floral and geometric pattern motifs, symmetrical decorative linework, rich multi-color jewel tones of magenta teal gold violet emerald crimson, strong pattern contrast, full-frame decorative transformation while keeping the main subject and composition recognizable, original decorative style not copying any specific artwork",
    negative:
      "plain colorize only, simple saturation boost, radial gradient only, photorealistic unchanged, watermark, text, logo, monochrome",
    strength: 0.7,
  },
  retro3d: {
    prompt:
      "transform this entire photograph into early 3D game-art style, low-poly color cells, baked lighting, slightly blocky forms, full-frame retro 3D look, preserve composition",
    negative: "photorealistic, modern 4k photo, watermark, text, logo",
    strength: 0.68,
  },
};

function getCredentials(): { accountId: string; token: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) {
    throw new Error("Workers AI is not configured on the server.");
  }
  return { accountId, token };
}

function intensityToStrength(base: number, intensity: number): number {
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  return Math.max(0.4, Math.min(0.88, base * (0.55 + t * 0.55)));
}

async function parseImageResponse(res: Response): Promise<Buffer> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = (await res.json()) as {
      success?: boolean;
      errors?: { message?: string }[];
      result?: { image?: string } | string;
      image?: string;
    };
    if (json.success === false) {
      const msg = json.errors?.[0]?.message || "Workers AI request failed";
      throw new Error(msg);
    }
    const b64 =
      (typeof json.result === "object" && json.result?.image) ||
      (typeof json.result === "string" ? json.result : null) ||
      json.image;
    if (typeof b64 === "string") {
      const cleaned = b64.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(cleaned, "base64");
    }
    throw new Error("Unexpected Workers AI JSON response");
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Run img2img-style transform for an AI+ graphic filter.
 * Single primary model only. Throws on failure → caller uses local NPR.
 */
export async function runAiPlusImg2Img(opts: {
  style: AiPlusStyleKey;
  intensity: number;
  imageBytes: Buffer;
  width?: number;
  height?: number;
}): Promise<{ bytes: Buffer; model: string }> {
  const { accountId, token } = getCredentials();
  const recipe = STYLE_PROMPTS[opts.style];
  if (!recipe) throw new Error(`Unsupported AI+ style: ${opts.style}`);

  const strength = intensityToStrength(recipe.strength, opts.intensity);
  const w = opts.width ? Math.min(1024, Math.max(256, opts.width)) : undefined;
  const h = opts.height ? Math.min(1024, Math.max(256, opts.height)) : undefined;
  const model = AI_PLUS_PRIMARY_MODEL;
  const url = `${AI_BASE}/${accountId}/ai/run/${model}`;

  try {
    const form = new FormData();
    form.append("prompt", recipe.prompt);
    form.append("steps", "4"); // klein is fixed-step distilled
    if (w) form.append("width", String(w));
    if (h) form.append("height", String(h));
    const blob = new Blob([new Uint8Array(opts.imageBytes)], {
      type: "image/jpeg",
    });
    form.append("input_image_0", blob, "source.jpg");

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const bytes = await parseImageResponse(res);
    if (bytes.length < 500) throw new Error("Empty image from model");
    return { bytes, model };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[workers-ai]", model, msg);
    throw e instanceof Error ? e : new Error(msg);
  }
}

export function isAiPlusStyle(style: string | undefined): style is AiPlusStyleKey {
  return !!style && style in STYLE_PROMPTS;
}
