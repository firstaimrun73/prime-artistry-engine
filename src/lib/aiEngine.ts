import Anthropic from "@anthropic-ai/sdk";

export type EditMode = "image" | "video";
export type UserTier = "free" | "pro" | "enterprise";

export interface EditRequest {
  userPrompt: string;
  sourceUrl: string;
  mode: EditMode;
  userId: string;
  tier: UserTier;
  videoDurationSeconds?: number;
  idempotencyKey: string;
}

export interface ExpandedIntent {
  professionalPrompt: string;
  negativePrompt: string;
  strength: number;
  guidanceScale: number;
  steps: number;
  style: string;
  motionGuidance?: string;
  durationSeconds?: number;
}

export interface EditResult {
  outputUrl: string;
  watermarked: boolean;
  creditsUsed: number;
  expandedIntent: ExpandedIntent;
  processingMs: number;
}

export interface EditSessionState {
  sourceFile: File | null;
  sourceUrl: string | null;
  sourcePreviewUrl: string | null;
  userPrompt: string;
  expandedIntent: ExpandedIntent | null;
  outputUrl: string | null;
  jobId: string | null;
  status: "idle" | "uploading" | "processing" | "done" | "error";
  errorMessage: string | null;
  creditsUsed: number;
  mode: EditMode;
  videoDurationSeconds: number;
}

export const INITIAL_EDIT_SESSION: EditSessionState = {
  sourceFile: null,
  sourceUrl: null,
  sourcePreviewUrl: null,
  userPrompt: "",
  expandedIntent: null,
  outputUrl: null,
  jobId: null,
  status: "idle",
  errorMessage: null,
  creditsUsed: 0,
  mode: "image",
  videoDurationSeconds: 8,
};

export const CREDIT_COSTS = {
  image_edit: 2,
  image_enhance: 3,
  image_generate: 5,
  video_5s: 10,
  video_8s: 15,
  video_12s: 22,
  video_16s: 30,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

const client = new Anthropic();

export async function expandPrompt(
  userPrompt: string,
  mode: EditMode,
  imageDescription?: string
): Promise<ExpandedIntent> {
  const systemPrompt = `You are a professional AI image and video editor.
Your job: take a SHORT user prompt and expand it into a COMPLETE professional editing directive.
Return ONLY valid JSON, no markdown, no explanation.

JSON schema:
{
  "professionalPrompt": "string — full positive prompt, 60-120 words, highly detailed",
  "negativePrompt": "string — what to avoid, 40-60 words",
  "strength": number between 0.35 and 0.95,
  "guidanceScale": number between 7.0 and 14.0,
  "steps": integer between 30 and 60,
  "style": "cinematic|portrait|landscape|product|abstract|anime|photorealistic|artistic",
  "motionGuidance": "string — only for video",
  "durationSeconds": number — only for video
}

STRENGTH RULES:
- subtle, slight → 0.35–0.45
- enhance, improve → 0.55–0.65
- dramatic, transform → 0.75–0.90
- replace background, change style → 0.85–0.95
- unclear → 0.65`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Mode: ${mode}\nUser prompt: "${userPrompt}"\n${imageDescription ? `Image content: ${imageDescription}` : ""}\n\nExpand this into a professional ${mode} editing directive.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean) as ExpandedIntent;
    parsed.steps = Math.max(parsed.steps, 30);
    parsed.guidanceScale = Math.max(parsed.guidanceScale, 7.0);
    parsed.strength = Math.min(Math.max(parsed.strength, 0.35), 0.95);
    parsed.professionalPrompt = injectQualityBoosters(
      parsed.professionalPrompt,
      mode
    );
    return parsed;
  } catch {
    return getDefaultIntent(userPrompt, mode);
  }
}

function injectQualityBoosters(prompt: string, mode: EditMode): string {
  const imageQuality =
    "masterpiece, best quality, ultra-detailed, sharp focus, 8k uhd, professional photography";
  const videoQuality =
    "cinematic quality, smooth motion, temporal consistency, professional color grading";
  const booster = mode === "image" ? imageQuality : videoQuality;
  if (prompt.includes("masterpiece") || prompt.includes("cinematic quality")) {
    return prompt;
  }
  return `${prompt}, ${booster}`;
}

function getDefaultIntent(userPrompt: string, mode: EditMode): ExpandedIntent {
  return {
    professionalPrompt: `${userPrompt}, masterpiece, best quality, ultra-detailed, sharp focus, 8k uhd, professional lighting`,
    negativePrompt:
      "blurry, low quality, pixelated, oversaturated, noise, grain, watermark, text, ugly, deformed, artifacts",
    strength: 0.65,
    guidanceScale: 9.5,
    steps: mode === "video" ? 40 : 35,
    style: "photorealistic",
    motionGuidance: mode === "video" ? "smooth, natural camera movement" : undefined,
    durationSeconds: mode === "video" ? 8 : undefined,
  };
}

export interface VideoSegment {
  prompt: string;
  seconds: number;
  motionIntensity: number;
}

export async function planVideoDuration(
  userPrompt: string,
  requestedSeconds: number = 8
): Promise<{ segments: VideoSegment[]; totalSeconds: number }> {
  const clampedTotal = Math.min(Math.max(requestedSeconds, 5), 16);
  const maxSegment = 8;

  if (clampedTotal <= maxSegment) {
    return {
      segments: [{ prompt: injectQualityBoosters(userPrompt, "video"), seconds: clampedTotal, motionIntensity: 0.7 }],
      totalSeconds: clampedTotal,
    };
  }

  const numSegments = Math.ceil(clampedTotal / maxSegment);
  return {
    segments: Array.from({ length: numSegments }, () => ({
      prompt: injectQualityBoosters(userPrompt, "video"),
      seconds: clampedTotal / numSegments,
      motionIntensity: 0.7,
    })),
    totalSeconds: clampedTotal,
  };
}

export function shouldWatermark(tier: UserTier, userPref: boolean): boolean {
  if (tier === "free") return true;
  return userPref;
}

export function getWatermarkConfig(tier: UserTier) {
  return {
    text: "MOTIO2EDIT",
    opacity: tier === "free" ? 0.6 : 0.3,
    position: "bottom-right",
    fontSize: 28,
    color: "#FFFFFF",
    padding: 16,
  };
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxAttempts) break;
      const msg = lastError.message.toLowerCase();
      if (msg.includes("unauthorized") || msg.includes("insufficient_credits")) throw lastError;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 120000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}
