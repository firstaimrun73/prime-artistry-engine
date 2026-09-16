/**
 * Server-only Cloudflare Workers AI client for Motio2edit Filters.
 * Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (never client-exposed).
 */

const AI_BASE = "https://api.cloudflare.com/client/v4/accounts";

/** Preferred models — tried in order until one succeeds. */
export const AI_PLUS_MODELS = [
  // Fast multi-ref / edit-capable FLUX.2 klein
  "@cf/black-forest-labs/flux-2-klein-4b",
  // High-quality multi-reference FLUX.2
  "@cf/black-forest-labs/flux-2-dev",
  // Classic img2img (image_b64 + strength)
  "@cf/runwayml/stable-diffusion-v1-5-img2img",
  // Fallback diffusion
  "@cf/lykon/dreamshaper-8-lcm",
] as const;

export type AiPlusStyleKey =
  | "sketch"
  | "oil"
  | "watercolor"
  | "cartoon"
  | "comic"
  | "anime"
  | "ghibli"
  | "cyberpunk"
  | "neon"
  | "retro3d";

const STYLE_PROMPTS: Record<
  AiPlusStyleKey,
  { prompt: string; negative: string; strength: number }
> = {
  sketch: {
    prompt:
      "transform this entire photograph into a detailed hand-drawn graphite pencil sketch on textured paper, strong black ink outlines, cross-hatching in shadows, full-frame illustration, preserve composition and subject identity, high detail line work",
    negative:
      "color photo, photorealistic, blurry, watermark, text, logo, low detail, blank areas, soft focus",
    strength: 0.72,
  },
  oil: {
    prompt:
      "transform this entire photograph into a rich oil painting with visible brush strokes, thick impasto texture, classical painterly color mixing, full-frame painted surface, preserve composition and subject",
    negative:
      "photograph, photo, digital, sharp photo edges, watermark, text, logo, smooth plastic skin",
    strength: 0.68,
  },
  watercolor: {
    prompt:
      "transform this entire photograph into a soft watercolor painting, pigment bleeds, paper texture, gentle washes, full-frame watercolor, preserve composition",
    negative: "photograph, hard edges, plastic, watermark, text, logo",
    strength: 0.65,
  },
  cartoon: {
    prompt:
      "transform this entire photograph into a bold cartoon illustration, cel-shaded flat colors, clean thick black outlines, simplified shapes, full-frame cartoon style, preserve subject identity",
    negative: "photorealistic, photo, grain, watermark, text, logo, muddy colors",
    strength: 0.7,
  },
  comic: {
    prompt:
      "transform this entire photograph into a comic book illustration, bold ink outlines, halftone shading, dramatic contrast, saturated panels style, full-frame comic art, preserve composition",
    negative: "photorealistic, soft photo, watermark, text, logo, blurry",
    strength: 0.72,
  },
  anime: {
    prompt:
      "transform this entire photograph into a clean anime illustration style, soft cel shading, crisp line art, expressive but recognizable subject, full-frame anime look",
    negative: "photorealistic, 3d render, watermark, text, logo",
    strength: 0.68,
  },
  ghibli: {
    prompt:
      "transform this entire photograph into a warm hand-painted storybook animation frame, soft painterly landscapes, gentle sunlight, whimsical illustrated atmosphere, full-frame painted look, preserve composition and subject identity, original style not copying any franchise",
    negative:
      "photorealistic, photo, watermark, text, logo, dark horror, harsh contrast",
    strength: 0.7,
  },
  cyberpunk: {
    prompt:
      "transform this entire photograph into a cyberpunk illustrated scene, neon magenta and cyan lights, wet reflective streets, high contrast graphic look, full-frame cyberpunk, preserve composition",
    negative: "daylight photo, natural colors only, watermark, text, logo",
    strength: 0.65,
  },
  neon: {
    prompt:
      "transform this entire photograph with intense neon rim lighting, glowing edges, dark ambient background, full-frame neon graphic treatment, preserve subject",
    negative: "flat lighting, daylight, watermark, text, logo",
    strength: 0.6,
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
  // Map intensity so mid values still transform; high intensity = stronger AI transform
  return Math.max(0.35, Math.min(0.9, base * (0.55 + t * 0.55)));
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
 * Returns PNG/JPEG bytes. Throws on total failure (caller should fall back to local NPR).
 */
export async function runAiPlusImg2Img(opts: {
  style: AiPlusStyleKey;
  intensity: number;
  /** Raw image bytes (jpeg/png/webp) */
  imageBytes: Buffer;
  width?: number;
  height?: number;
}): Promise<{ bytes: Buffer; model: string }> {
  const { accountId, token } = getCredentials();
  const recipe = STYLE_PROMPTS[opts.style];
  if (!recipe) throw new Error(`Unsupported AI+ style: ${opts.style}`);

  const strength = intensityToStrength(recipe.strength, opts.intensity);
  const imageB64 = opts.imageBytes.toString("base64");
  const w = opts.width ? Math.min(1024, Math.max(256, opts.width)) : undefined;
  const h = opts.height ? Math.min(1024, Math.max(256, opts.height)) : undefined;

  let lastError: Error | null = null;

  for (const model of AI_PLUS_MODELS) {
    try {
      const url = `${AI_BASE}/${accountId}/ai/run/${model}`;

      // FLUX.2 family prefers multipart with binary image refs
      if (model.includes("flux-2")) {
        const form = new FormData();
        form.append("prompt", recipe.prompt);
        form.append("steps", "12");
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
      }

      // Classic JSON img2img
      const body: Record<string, unknown> = {
        prompt: recipe.prompt,
        negative_prompt: recipe.negative,
        image_b64: imageB64,
        strength,
        num_steps: 18,
        guidance: 7.5,
      };
      if (w) body.width = w;
      if (h) body.height = h;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
      lastError = e instanceof Error ? e : new Error(String(e));
      // Try next model — do not log token
      console.error("[workers-ai]", model, lastError.message);
    }
  }

  throw lastError || new Error("All Workers AI models failed");
}

export function isAiPlusStyle(style: string | undefined): style is AiPlusStyleKey {
  return !!style && style in STYLE_PROMPTS;
}
