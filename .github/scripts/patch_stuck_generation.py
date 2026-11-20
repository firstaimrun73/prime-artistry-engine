#!/usr/bin/env python3
"""Fix stuck generation: FAL poll deadline, client timeout, honest toasts, safe rid logs."""
from pathlib import Path
import re
import sys

def patch_generate():
    path = Path("src/lib/generate.functions.ts")
    g = path.read_text(encoding="utf-8")
    if "timeoutMs ?? 90_000" in g and "genRequestId" in g:
        print("generate.functions already patched")
        return

    old_runfal_start = "async function runFal(step: FalStep, falKey: string): Promise<string> {"
    if old_runfal_start not in g:
        if "async function runFal(step: FalStep, falKey: string, opts?" in g:
            print("runFal already has opts")
        else:
            raise SystemExit("runFal signature not found")
    else:
        start = g.find(old_runfal_start)
        marker = '  if (!completed) {\n    throw new Error(`${step.label}: timed out waiting for provider (120 status polls)`);\n  }'
        end = g.find(marker, start)
        if end < 0:
            raise SystemExit("runFal timeout marker not found")
        end = end + len(marker)
        new_block = '''async function runFal(step: FalStep, falKey: string, opts?: { timeoutMs?: number; requestId?: string }): Promise<string> {
  // Keep under typical serverless maxDuration so the platform does not kill the
  // function mid-poll (which leaves the client stuck on a loading overlay).
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const rid = opts?.requestId ?? "n/a";
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify((step as FalStep & { input?: unknown; body?: unknown }).input ?? (step as FalStep & { body?: unknown }).body),
  });
  const submitTxt = await submit.text();
  if (!submit.ok) throw new Error(falErrorMessage(step.label, submit.status, submitTxt));
  let submitJson: { request_id?: string; status_url?: string; response_url?: string };
  try {
    submitJson = JSON.parse(submitTxt);
  } catch {
    throw new Error(`${step.label}: invalid queue response`);
  }
  const statusUrl = submitJson.status_url;
  const responseUrl = submitJson.response_url;
  const falRequestId = submitJson.request_id ?? null;
  if (!statusUrl || !responseUrl) throw new Error(`${step.label}: missing status/response URL`);
  console.info("[generate] fal submitted", {
    rid,
    falRequestId,
    label: step.label,
    model: step.model,
  });

  const deadline = Date.now() + timeoutMs;
  let completed = false;
  let delay = 1000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const stTxt = await st.text();
    if (!st.ok) throw new Error(falErrorMessage(`${step.label} status`, st.status, stTxt));
    let stJson: { status?: string };
    try {
      stJson = JSON.parse(stTxt);
    } catch {
      delay = Math.min(delay + 500, 3000);
      continue;
    }
    if (stJson.status) lastStatus = stJson.status;
    if (stJson.status === "COMPLETED") {
      completed = true;
      break;
    }
    if (stJson.status === "FAILED" || stJson.status === "CANCELLED" || stJson.status === "ERROR") {
      throw new Error(`${step.label} ${stJson.status}`);
    }
    delay = Math.min(Math.floor(delay * 1.25), 3000);
  }
  if (!completed) {
    console.error("[generate] fal poll timeout", { rid, falRequestId, label: step.label, lastStatus, timeoutMs });
    throw new Error(`${step.label}: timed out waiting for provider. Please try again.`);
  }'''
        g = g[:start] + new_block + g[end:]

    m = re.search(r'console\.info\("\[generate\] FAL auth context".*?\);', g)
    if m and "genRequestId" not in m.group(0):
        new_auth = '''const genRequestId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    console.info("[generate] FAL auth context", {
      rid: genRequestId,
      source: falKeySource,
      keyLen: falKey.length,
      studioTier: (data as { studioTier?: string | null }).studioTier ?? null,
      workspaceMode: (data as { workspaceMode?: string | null }).workspaceMode ?? null,
      type: data.type,
      hasImageUrl: Boolean(data.imageUrl),
      promptLen: typeof data.prompt === "string" ? data.prompt.length : 0,
    });'''
        g = g[: m.start()] + new_auth + g[m.end() :]

    g = g.replace(
        "(data as any).prompt = finalPrompt;",
        "(data as any).prompt = finalPrompt.length > 3900 ? finalPrompt.slice(0, 3900) : finalPrompt;",
        1,
    )

    if g.count("{") != g.count("}"):
        raise SystemExit("brace mismatch generate.functions")
    path.write_text(g, encoding="utf-8")
    print(f"patched generate.functions.ts size={path.stat().st_size}")


def patch_fal_client():
    path = Path("src/lib/studio/image/standard/fal-client.ts")
    t = path.read_text(encoding="utf-8")
    if "timeoutMs ?? 90_000" in t:
        print("fal-client already 90s")
        return
    if "timeoutMs ?? 120_000" not in t:
        raise SystemExit("fal-client timeout default not found")
    path.write_text(t.replace("timeoutMs ?? 120_000", "timeoutMs ?? 90_000", 1), encoding="utf-8")
    print("patched fal-client timeout 90s")


def patch_image_editor():
    path = Path("src/components/editor/image/ImageEditor.tsx")
    ie = path.read_text(encoding="utf-8")
    if "CLIENT_GEN_TIMEOUT_MS" in ie:
        print("ImageEditor already has client timeout")
        return

    old_timers = """    const progressTimers = [
      setTimeout(() => {
        if (runId === runIdRef.current) toast(\"Still working — high quality takes a moment…\");
      }, 30_000),
      setTimeout(() => {
        if (runId === runIdRef.current) toast(\"Taking longer than usual — retrying automatically…\");
      }, 75_000),
    ];"""
    new_timers = """    const progressTimers = [
      setTimeout(() => {
        if (runId === runIdRef.current) toast(\"Still working — high quality takes a moment…\");
      }, 25_000),
      setTimeout(() => {
        if (runId === runIdRef.current)
          toast(\"Still generating — large edits can take up to about 2 minutes…\");
      }, 60_000),
    ];
    // Hard client timeout: if the server function is killed (platform limit) or the
    // network stalls, the overlay must not spin forever.
    const CLIENT_GEN_TIMEOUT_MS = 140_000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            \"Generation timed out. The AI service took too long — please try again with a simpler prompt or fewer references.\",
          ),
        );
      }, CLIENT_GEN_TIMEOUT_MS);
    });"""
    if old_timers not in ie:
        raise SystemExit("progressTimers block not found")
    ie = ie.replace(old_timers, new_timers, 1)

    if "workspaceMode," in ie and "Promise.race" not in ie:
        old = """      const result = await generate({
        data: {
          type: \"image\",
          prompt: opts.jobPrompt,"""
        new = """      const result = await Promise.race([
        generate({
          data: {
            type: \"image\",
            prompt: opts.jobPrompt.length > 3900 ? opts.jobPrompt.slice(0, 3900) : opts.jobPrompt,"""
        if old not in ie:
            raise SystemExit("generate call start not found")
        ie = ie.replace(old, new, 1)
        old_close = """          workspaceMode,
        },
      });"""
        new_close = """          workspaceMode,
          },
        }),
        timeoutPromise,
      ]);"""
        if old_close not in ie:
            raise SystemExit("generate close not found")
        ie = ie.replace(old_close, new_close, 1)

    old_finally = """    } finally {
      progressTimers.forEach(clearTimeout);
    }
  };

  const runGenerate = async () => {"""
    new_finally = """    } finally {
      progressTimers.forEach(clearTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const runGenerate = async () => {"""
    if old_finally not in ie:
        raise SystemExit("finally block not found")
    ie = ie.replace(old_finally, new_finally, 1)

    old_build = """          jobPrompt = buildFinalEditPrompt({
            rawPrompt: prompt.trim(),
            enhancedOrExpanded: expanded,
            intent,
            referenceCount: Math.max(1, refCount),
          });"""
    if old_build in ie and "jobPrompt.length > 3900" not in ie:
        ie = ie.replace(
            old_build,
            old_build + "\n          if (jobPrompt.length > 3900) jobPrompt = jobPrompt.slice(0, 3900);",
            1,
        )

    if "export function ImageEditor" not in ie or "ImageEditor stub" in ie:
        raise SystemExit("ImageEditor integrity check failed")
    if ie.count("{") != ie.count("}"):
        raise SystemExit("brace mismatch ImageEditor")
    path.write_text(ie, encoding="utf-8")
    print(f"patched ImageEditor size={path.stat().st_size}")


def main():
    patch_generate()
    patch_fal_client()
    patch_image_editor()
    print("all patches applied")


if __name__ == "__main__":
    main()
