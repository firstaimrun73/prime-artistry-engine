/**
 * Minimal fal queue client for Standard Image Studio.
 * Throws on failure / timeout / missing URL — caller must not deduct credits.
 *
 * Aligned with generate.functions runFal for status validation, CANCELLED handling,
 * and multi-shape output URL extraction.
 */

import type { StandardFalStep } from "./types";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithDeadline(
  url: string,
  init: RequestInit | undefined,
  remainingMs: number,
): Promise<Response> {
  const budget = Math.max(1_000, Math.min(remainingMs, 60_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI service request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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
 * Extract first HTTPS image/video URL from common fal.ai result shapes.
 * Exported for unit tests.
 */
export function extractFalOutputUrl(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;

  const candidates: unknown[] = [
    (root.image as { url?: unknown } | undefined)?.url,
    Array.isArray(root.images) ? (root.images[0] as { url?: unknown } | undefined)?.url : undefined,
    (root.video as { url?: unknown } | undefined)?.url,
    root.output,
    root.url,
    (root.data as { image?: { url?: unknown } } | undefined)?.image?.url,
    Array.isArray((root.data as { images?: unknown } | undefined)?.images)
      ? ((root.data as { images: { url?: unknown }[] }).images[0] as { url?: unknown } | undefined)?.url
      : undefined,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

/**
 * Submit step → poll → return output URL.
 * Never returns empty string. Never returns the input image URL as a fake result.
 */
export async function runStandardFalStep(
  step: StandardFalStep,
  falKey: string,
  opts?: { timeoutMs?: number; requestId?: string },
): Promise<string> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const rid = opts?.requestId ?? "n/a";

  const promptHead =
    typeof step.body.prompt === "string" ? String(step.body.prompt).slice(0, 120) : "";
  const hasImage =
    typeof step.body.image_url === "string" ||
    (Array.isArray(step.body.image_urls) && (step.body.image_urls as unknown[]).length > 0);
  console.log(
    "[standard-fal] ▶",
    step.label,
    "|",
    step.model,
    "| image=",
    hasImage,
    "| promptHead=",
    promptHead,
  );

  const submit = await fetchWithDeadline(
    `${FAL_QUEUE}${step.model}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(step.body),
    },
    timeoutMs,
  );
  const submitTxt = await submit.text();
  if (!submit.ok) {
    console.error("[standard-fal] submit failed", step.label, submit.status, submitTxt.slice(0, 300));
    throw new Error(falErrorMessage(step.label, submit.status, submitTxt));
  }

  let submitJson: { request_id?: string; status_url?: string; response_url?: string };
  try {
    submitJson = JSON.parse(submitTxt) as typeof submitJson;
  } catch {
    throw new Error(`${step.label}: invalid queue response`);
  }

  const statusUrl = submitJson.status_url;
  const responseUrl = submitJson.response_url;
  const falRequestId = submitJson.request_id ?? null;
  if (!statusUrl || !responseUrl) {
    console.error("[standard-fal] missing status/response URL", step.label, submitTxt.slice(0, 200));
    throw new Error(`${step.label}: missing status/response URL from queue`);
  }
  console.info("[standard-fal] submitted", {
    rid,
    falRequestId,
    label: step.label,
    model: step.model,
  });

  const deadline = Date.now() + timeoutMs;
  let delay = 1200;
  let lastStatus = "";

  while (Date.now() < deadline) {
    await sleep(delay);
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const st = await fetchWithDeadline(statusUrl, { headers }, remaining);
    const stTxt = await st.text();

    if (!st.ok) {
      // Auth failures must not be silently retried
      if (st.status === 401 || st.status === 403) {
        throw new Error(falErrorMessage(`${step.label} status`, st.status, stTxt));
      }
      delay = Math.min(delay * 1.3, 5000);
      continue;
    }

    let sj: { status?: string };
    try {
      sj = JSON.parse(stTxt) as { status?: string };
    } catch {
      delay = Math.min(delay * 1.3, 5000);
      continue;
    }

    if (sj.status) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR" || sj.status === "CANCELLED") {
      const body = await fetchWithDeadline(
        responseUrl,
        { headers },
        Math.max(3_000, deadline - Date.now()),
      )
        .then((r) => r.text())
        .catch(() => "");
      console.error("[standard-fal] job terminal", step.label, lastStatus, body.slice(0, 400), {
        falRequestId,
      });
      throw new Error(falErrorMessage(step.label, 500, body || `status=${lastStatus}`));
    }
    delay = Math.min(delay * 1.3, 5000);
  }

  if (lastStatus !== "COMPLETED") {
    console.error("[standard-fal] poll timeout", {
      rid,
      falRequestId,
      label: step.label,
      lastStatus,
      timeoutMs,
    });
    throw new Error(`${step.label} timed out. Credits not charged.`);
  }

  const res = await fetchWithDeadline(
    responseUrl,
    { headers },
    Math.max(5_000, deadline - Date.now()),
  );
  const resTxt = await res.text();
  if (!res.ok) {
    throw new Error(falErrorMessage(step.label, res.status, resTxt));
  }

  let json: unknown;
  try {
    json = JSON.parse(resTxt);
  } catch {
    throw new Error(`${step.label}: invalid result JSON`);
  }

  const url = extractFalOutputUrl(json);
  if (!url) {
    console.error("[standard-fal] no output URL", step.label, resTxt.slice(0, 200), {
      falRequestId,
    });
    throw new Error(`${step.label} returned no output URL. Credits not charged.`);
  }
  console.log("[standard-fal] ✓", step.label, "→", url.slice(0, 80), { falRequestId });
  return url;
}
