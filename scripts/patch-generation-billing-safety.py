from pathlib import Path
import hashlib
p = Path("src/lib/generate.functions.ts")
t = p.read_text()
print("sha256", hashlib.sha256(t.encode()).hexdigest())
assert "PLACEHOLDER" not in t and "LOADING_FROM_FILE" not in t
assert "export const generateMedia" in t
assert len(t.encode()) > 18000

old_loop = """  for (let i = 0; i < 120; i++) {
    await sleep(i < 5 ? 1000 : 2000);
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const stTxt = await st.text();
    if (!st.ok) throw new Error(falErrorMessage(`${step.label} status`, st.status, stTxt));
    let stJson: { status?: string };
    try {
      stJson = JSON.parse(stTxt);
    } catch {
      continue;
    }
    if (stJson.status === "COMPLETED") break;
    if (stJson.status === "FAILED" || stJson.status === "CANCELLED") {
      throw new Error(`${step.label} ${stJson.status}`);
    }
  }

  const res = await fetch(responseUrl, {"""

new_loop = """  let completed = false;
  for (let i = 0; i < 120; i++) {
    await sleep(i < 5 ? 1000 : 2000);
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const stTxt = await st.text();
    if (!st.ok) throw new Error(falErrorMessage(`${step.label} status`, st.status, stTxt));
    let stJson: { status?: string };
    try {
      stJson = JSON.parse(stTxt);
    } catch {
      continue;
    }
    if (stJson.status === "COMPLETED") {
      completed = true;
      break;
    }
    if (stJson.status === "FAILED" || stJson.status === "CANCELLED") {
      throw new Error(`${step.label} ${stJson.status}`);
    }
  }
  if (!completed) {
    throw new Error(`${step.label}: timed out waiting for provider (120 status polls)`);
  }

  const res = await fetch(responseUrl, {"""

if "timed out waiting for provider" not in t:
    if old_loop not in t:
        raise SystemExit("PRECONDITION FAIL: runFal loop")
    t = t.replace(old_loop, new_loop, 1)

if "await quoteVideoGeneration" in t:
    start = t.find("        const quote = await quoteVideoGeneration({")
    if start < 0:
        raise SystemExit("PRECONDITION FAIL: video quote start")
    end = t.find("      } else {\n        const multiUrls", start)
    if end < 0:
        raise SystemExit("PRECONDITION FAIL: video quote end")
    new_video = """        const quoteResult = quoteVideoGeneration({
          userId,
          mode: (data.videoMode as VideoGenMode) || "text-to-video",
          productMode: (data.videoProductMode as VideoProductMode) || "standard",
          resolution: (data.videoResolution as VideoResolution) || "720p",
          aspect: (data.videoAspect as VideoAspect) || "16:9",
          durationSec: duration,
          audio: !!data.videoGenerateAudio,
        });
        if (!quoteResult.ok) {
          throw new Error(quoteResult.message);
        }
        const videoQuote = quoteResult.quote;
        cost = quoteResult.displayCredits;
        if (!isAdmin && cost > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          reservedVideoQuote = await reserveCreditsForQuote(
            supabaseAdmin,
            videoQuote,
            credits,
          );
          markGenerating(reservedVideoQuote);
        }

        const route = selectApprovedVideoRoute({
          mode: (data.videoMode as VideoGenMode) || "text-to-video",
          productMode: (data.videoProductMode as VideoProductMode) || "standard",
          resolution: (data.videoResolution as VideoResolution) || "720p",
          hasImage: !!data.imageUrl,
        } as any);
        const styledPrompt = applyVideoStyle(data.prompt, data.videoStyle ?? undefined);
        const step = buildVideoFromRegistry({
          route,
          prompt: styledPrompt,
          imageUrl: data.imageUrl ?? undefined,
          durationSec: duration,
          aspect: (data.videoAspect as VideoAspect) || "16:9",
          generateAudio: !!data.videoGenerateAudio,
        } as any);
        outputUrl = await runFal(step as any, falKey);
        providerSourceUrl = outputUrl;

        if (reservedVideoQuote) {
          finalizeQuote(reservedVideoQuote, {
            finalCredits: reservedVideoQuote.customerCredits,
          });
          reservedVideoQuote = null;
        }
"""
    t = t[:start] + new_video + t[end:]

old_rel = """      if (reservedVideoQuote) {
        try {
          await releaseReservation(supabase, reservedVideoQuote);
          markFailed(reservedVideoQuote);
        } catch {
          /* ignore */
        }
      }"""
new_rel = """      if (reservedVideoQuote) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await releaseReservation(supabaseAdmin, reservedVideoQuote);
          markFailed(reservedVideoQuote);
        } catch {
          /* ignore */
        }
      }"""
if "releaseReservation(supabase," in t:
    if old_rel not in t:
        raise SystemExit("PRECONDITION FAIL: release block")
    t = t.replace(old_rel, new_rel, 1)

if "await quoteVideoGeneration" in t:
    raise SystemExit("POSTCONDITION FAIL: still awaits quoteVideoGeneration")
if "quoteResult.ok" not in t:
    raise SystemExit("POSTCONDITION FAIL: missing quoteResult handling")
if "await finalizeQuote" in t:
    raise SystemExit("POSTCONDITION FAIL: finalizeQuote is sync")
if "timed out waiting for provider" not in t:
    raise SystemExit("POSTCONDITION FAIL: missing timeout")
if "debit_credits" in t:
    raise SystemExit("POSTCONDITION FAIL: debit_credits present")
if "deduct_credits" not in t:
    raise SystemExit("POSTCONDITION FAIL: deduct_credits missing")
if len(t.encode()) < 18000:
    raise SystemExit(f"POSTCONDITION FAIL: size {len(t.encode())}")
p.write_text(t)
print("patched_ok", len(t.encode()))
