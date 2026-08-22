/**
 * Minimal fal queue client for Standard Image Studio.
 * Throws on failure / timeout / missing URL — caller must not deduct credits.
 */

import type { StandardFalStep } from "./types";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function falErrorMessage(label: string, status: number, txt: string): string {
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
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403)
    return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail))
    return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (/file_download_error|download the file/i.test(detail))
    return "The uploaded media could not be fetched by the AI. Please re-upload and try again.";
  if (/image_load_error|corrupted|supported format/i.test(detail))
    return "The uploaded image is invalid or in an unsupported format. Try a JPG or PNG.";
  if (/nsfw|safety/i.test(detail))
    return "The request was blocked by the safety filter. Try a different prompt or image.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

/**
 * Submit step → poll → return output URL.
 * Never returns empty string. Never returns the input image URL as a fake result.
 */
export async function runStandardFalStep(
  step: StandardFalStep,
  falKey: string,
  opts?: { timeoutMs?: number },
): Promise<string> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const timeoutMs = opts?.timeoutMs ?? 120_000;

  console.log("[standard-fal] ▶", step.label, "|", step.model);

  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(step.body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(falErrorMessage(step.label, submit.status, txt));
  }

  const { status_url, response_url } = (await submit.json()) as {
    request_id?: string;
    status_url: string;
    response_url: string;
  };

  const deadline = Date.now() + timeoutMs;
  let delay = 1200;
  let lastStatus = "";

  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      delay = Math.min(delay * 1.3, 5000);
      continue;
    }
    const sj = (await st.json()) as { status?: string };
    if (sj.status) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      const body = await fetch(response_url, { headers })
        .then((r) => r.text())
        .catch(() => "");
      throw new Error(falErrorMessage(step.label, 500, body));
    }
    delay = Math.min(delay * 1.3, 5000);
  }

  if (lastStatus !== "COMPLETED") {
    throw new Error(`${step.label} timed out. Credits not charged.`);
  }

  const res = await fetch(response_url, { headers });
  if (!res.ok) {
    throw new Error(falErrorMessage(step.label, res.status, await res.text()));
  }

  const json = (await res.json()) as {
    image?: { url?: string };
    images?: { url?: string }[];
  };
  const url = json.image?.url ?? json.images?.[0]?.url ?? null;
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    throw new Error(`${step.label} returned no output URL. Credits not charged.`);
  }
  return url;
}
