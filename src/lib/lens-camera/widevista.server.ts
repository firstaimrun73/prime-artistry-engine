/**
 * Widevista Stage A — server AI expansion via existing IMAGE_EDIT_MODEL (Kontext).
 * Stage B optical treatment remains mild client-side; expansion is the real FOV gain.
 * Never expose provider/model names to the client.
 */
import {
  IMAGE_EDIT_MODEL,
  buildImageEdit,
  type FalStep,
} from "@/lib/fal-request";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function falErrorMessage(status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail))
      detail = (parsed.detail as { msg?: string }[])
        .map((d) => d?.msg)
        .filter(Boolean)
        .join("; ");
  } catch {
    detail = txt.slice(0, 200);
  }
  if (status === 429) return "AI service is busy right now. Please retry in a moment.";
  if (status === 401 || status === 403) return "AI service authentication failed.";
  if (/balance|locked|billing|top up|exhausted/i.test(detail))
    return "AI service is temporarily unavailable. Please try again later.";
  if (detail) return `Widevista processing failed: ${detail.slice(0, 140)}`;
  return "Widevista processing failed. Please try again.";
}

async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(step.body),
  });
  if (!submit.ok) {
    throw new Error(falErrorMessage(submit.status, await submit.text()));
  }
  const { status_url, response_url } = (await submit.json()) as {
    status_url: string;
    response_url: string;
  };

  const deadline = Date.now() + 180_000;
  let delay = 1200;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      delay = Math.min(delay * 1.3, 4000);
      continue;
    }
    const sj = (await st.json()) as { status?: string };
    if (sj.status) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      const body = await fetch(response_url, { headers }).then((r) => r.text()).catch(() => "");
      throw new Error(falErrorMessage(500, body));
    }
    delay = Math.min(delay * 1.3, 4000);
  }
  if (lastStatus !== "COMPLETED") {
    throw new Error("Widevista processing timed out. Please try again.");
  }

  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(falErrorMessage(res.status, await res.text()));
  const json = (await res.json()) as {
    image?: { url?: string };
    images?: { url?: string }[];
  };
  const url = json.image?.url ?? json.images?.[0]?.url;
  if (!url) throw new Error("Widevista returned an empty result. Please try again.");
  return url;
}

const WIDEVISTA_EXPAND_PROMPT =
  "Widen the field of view of this photograph as if it were captured with a moderately wider-angle lens. " +
  "Naturally extend the environment at the edges only. Preserve the exact subject identity, faces, body proportions, " +
  "architecture lines, lighting, colors, and composition of the original center. " +
  "Do not stretch, squash, or distort people or buildings. No fisheye, no extreme barrel distortion, " +
  "no bent verticals, no artificial borders. Photorealistic, seamless edge reconstruction.";

export type WidevistaServerResult = {
  outputUrl: string;
  modelUsed: string;
};

export async function runWidevistaExpansion(imageUrl: string): Promise<WidevistaServerResult> {
  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("Widevista is temporarily unavailable. Please try again later.");
  }
  if (!imageUrl.startsWith("https://") && !imageUrl.startsWith("http://")) {
    throw new Error("Invalid image source for Widevista.");
  }

  const step = buildImageEdit({
    prompt: WIDEVISTA_EXPAND_PROMPT,
    imageUrl,
    guidanceOverride: 2.8,
  });
  step.model = IMAGE_EDIT_MODEL;
  step.endpoint = `https://fal.run/${IMAGE_EDIT_MODEL}`;

  const outputUrl = await runFalStep(step, falKey);
  return { outputUrl, modelUsed: IMAGE_EDIT_MODEL };
}
