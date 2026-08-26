/**
 * Shared FAL queue runtime for image/video generation.
 */
import type { FalStep } from "@/lib/fal-request";
import type { EditorIntent } from "@/lib/image-edit/prompt-engine";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DETERMINISTIC_INTENTS: ReadonlySet<EditorIntent> = new Set([
  "outfit_transfer", "outfit_single", "color", "remove_people", "object_remove",
  "add_subject", "restore", "colorize", "face_fix", "background", "small_add",
]);

const PREPARE_FAILED =
  "Couldn't finish preparing your image. Please try again or contact support.";

function falErrorMessage(label: string, status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail))
      detail = (parsed.detail as { msg?: string }[]).map((d) => d?.msg).filter(Boolean).join("; ");
  } catch { detail = txt.slice(0, 200); }
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403) return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail)) return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (/file_download_error|download the file/i.test(detail)) return "The uploaded media could not be fetched by the AI. Please re-upload and try again.";
  if (/image_load_error|corrupted|supported format/i.test(detail)) return "The uploaded image is invalid or in an unsupported format. Try a JPG or PNG.";
  if (/nsfw|safety/i.test(detail)) return "The request was blocked by the safety filter. Try a different prompt or image.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[fal] ▶ submit:", step.label, "| model:", step.model);
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, { method: "POST", headers, body: JSON.stringify(step.body) });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(falErrorMessage(step.label, submit.status, txt));
  }
  const { request_id, status_url, response_url } = (await submit.json()) as { request_id: string; status_url: string; response_url: string };
  void request_id;
  const deadline = Date.now() + 290_000;
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      const txt = await st.text();
      throw new Error(falErrorMessage(step.label, st.status, txt));
  }
    const body = (await st.json()) as { status?: string };
    lastStatus = body.status ?? "";
    if (lastStatus === "COMPLETED") break;
    if (lastStatus === "FAILED" || lastStatus === "ERROR") {
      const bodyTxt = await fetch(response_url, { headers }).then((r) => r.text()).catch(() => "");
      throw new Error(falErrorMessage(step.label, 500, bodyTxt || lastStatus));
    }
    delay = Math.min(delay + 500, 5000);
  }
  if (lastStatus !== "COMPLETED") throw new Error(`${step.label} timed out. Please retry.`);
  const res = await fetch(response_url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(falErrorMessage(step.label, res.status, txt));
  }
  const result = (await res.json()) as {
    images?: { url?: string }[];
    image?: { url?: string };
    video?: { url?: string };
    video_url?: string;
  };
  const url =
    result.images?.[0]?.url ??
    result.image?.url ??
    result.video?.url ??
    result.video_url ??
    null;
  if (!url || typeof url !== "string") throw new Error(`${step.label} returned no media URL.`);
  return url;
}

async function runFalStepResilient(step: FalStep, falKey: string, opts: { timeoutMs?: number; maxRetries?: number } = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? (step.outputKind === "video" ? 300_000 : 120_000);
  const maxRetries = opts.maxRetries ?? 2;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= maxRetries) {
    try {
      const url = await Promise.race([
        runFalStep(step, falKey),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Generation timed out. Please retry.")), timeoutMs)),
      ]);
      if (url && url.trim().length > 0) return url;
      throw new Error("No output received");
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/timed out|rate-limited|429|503|502|network|fetch failed/i.test(msg) && attempt < maxRetries) {
        attempt += 1;
        await sleep(1500 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export {
  FAL_QUEUE,
  sleep,
  DETERMINISTIC_INTENTS,
  PREPARE_FAILED,
  falErrorMessage,
  runFalStep,
  runFalStepResilient,
};
