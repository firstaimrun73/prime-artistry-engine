#!/usr/bin/env python3
"""Harden client timeout: in-flight lock, late success recovery, no double generate."""
from pathlib import Path
import re

path = Path("src/components/editor/image/ImageEditor.tsx")
ie = path.read_text(encoding="utf-8")

if "inFlightGenRef" in ie and "clientTimedOut && genPromise" in ie:
    print("already hardened")
    raise SystemExit(0)

if "CLIENT_GEN_TIMEOUT_MS" not in ie:
    raise SystemExit("CLIENT_GEN_TIMEOUT_MS missing — apply stuck-generation fix first")

if "inFlightGenRef" not in ie:
    m = re.search(r"const runIdRef = useRef\(0\);", ie)
    if not m:
        raise SystemExit("runIdRef not found")
    ie = (
        ie[: m.end()]
        + "\n  /** True while a generate() server call is still outstanding. */\n  const inFlightGenRef = useRef(false);"
        + ie[m.end() :]
    )

old_start = """    if (noCredits) {
      setState(\"blocked\");
      return toast.error(`Not enough credits. This costs ${cost} credits.`);
    }

    const runId = ++runIdRef.current;"""
new_start = """    if (noCredits) {
      setState(\"blocked\");
      return toast.error(`Not enough credits. This costs ${cost} credits.`);
    }
    if (inFlightGenRef.current) {
      return toast.error(\"A generation is already in progress. Please wait for it to finish.\");
    }

    const runId = ++runIdRef.current;"""
if old_start not in ie:
    raise SystemExit("runImageJob start guard site not found")
ie = ie.replace(old_start, new_start, 1)

basic_preamble = """    const CLIENT_GEN_TIMEOUT_MS = 140_000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            \"Generation timed out. The AI service took too long — please try again with a simpler prompt or fewer references.\",
          ),
        );
      }, CLIENT_GEN_TIMEOUT_MS);
    });
    try {"""

if basic_preamble in ie:
    ie = ie.replace(
        basic_preamble,
        """    const CLIENT_GEN_TIMEOUT_MS = 140_000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let clientTimedOut = false;
    let genPromise: Promise<unknown> | null = null;
    const throwIfClientTimedOut = () => {
      if (clientTimedOut) {
        throw new Error(
          \"Generation timed out. The AI service took too long — please try again with a simpler prompt or fewer references.\",
        );
      }
    };
    timeoutId = setTimeout(() => {
      clientTimedOut = true;
    }, CLIENT_GEN_TIMEOUT_MS);
    try {""",
        1,
    )
else:
    if "clientTimedOut" not in ie:
        raise SystemExit("unexpected timeout preamble shape")

basic_race = """      const result = await Promise.race([
        generate({
          data: {
            type: \"image\",
            prompt: opts.jobPrompt.length > 3900 ? opts.jobPrompt.slice(0, 3900) : opts.jobPrompt,
          imageUrl: mediaUrl,
          strength,
          aspectRatio,
          // IMAX requires Ultra 8k_max on the server validator — never send plain 8k for imax.
          imageQuality: aspectRatio === \"imax\" ? \"8k_max\" : imageQuality,
          studioTier,
          maskImageUrl,
          referenceImageUrls,
          contextTags: contextTags.length > 0 ? contextTags : undefined,
          keepWatermark: isFreePlanForWm ? true : keepWatermark,
          workspaceMode,
          },
        }),
        timeoutPromise,
      ]);"""

new_race = """      throwIfClientTimedOut();
      inFlightGenRef.current = true;
      genPromise = generate({
        data: {
          type: \"image\",
          prompt: opts.jobPrompt.length > 3900 ? opts.jobPrompt.slice(0, 3900) : opts.jobPrompt,
          imageUrl: mediaUrl,
          strength,
          aspectRatio,
          // IMAX requires Ultra 8k_max on the server validator — never send plain 8k for imax.
          imageQuality: aspectRatio === \"imax\" ? \"8k_max\" : imageQuality,
          studioTier,
          maskImageUrl,
          referenceImageUrls,
          contextTags: contextTags.length > 0 ? contextTags : undefined,
          keepWatermark: isFreePlanForWm ? true : keepWatermark,
          workspaceMode,
        },
      }).finally(() => {
        inFlightGenRef.current = false;
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          clientTimedOut = true;
          reject(
            new Error(
              \"Generation timed out. The AI service took too long — please try again with a simpler prompt or fewer references.\",
            ),
          );
        }, Math.max(5_000, CLIENT_GEN_TIMEOUT_MS - 1));
      });

      const result = await Promise.race([genPromise, timeoutPromise]);"""

if basic_race not in ie:
    raise SystemExit("basic Promise.race generate block not found")
ie = ie.replace(basic_race, new_race, 1)

basic_catch = """    } catch (err) {
      if (runId !== runIdRef.current) return;
      endGeneration();
      const msg = err instanceof Error ? err.message : \"Generation failed\";
      setState(\"idle\");
      if (isStandardExp) setStandardGenError(msg);
      if (isPremiumExp) setPremiumGenError(msg);
      if (isUltraExp) setUltraGenError(msg);
      toast.error(msg);
    } finally {
      progressTimers.forEach(clearTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const runGenerate = async () => {"""

new_catch = """    } catch (err) {
      if (runId !== runIdRef.current) return;
      endGeneration();
      const msg = err instanceof Error ? err.message : \"Generation failed\";
      setState(\"idle\");
      if (isStandardExp) setStandardGenError(msg);
      if (isPremiumExp) setPremiumGenError(msg);
      if (isUltraExp) setUltraGenError(msg);
      toast.error(msg);

      // Late server success after client timeout: show the image (credits already charged once).
      // A new user-initiated run bumps runIdRef and ignores this recovery.
      if (clientTimedOut && genPromise) {
        void genPromise
          .then(async (late) => {
            if (runId !== runIdRef.current) return;
            const lateUrl =
              (late as { outputUrl?: string; url?: string } | null)?.outputUrl ||
              (late as { url?: string } | null)?.url;
            if (!lateUrl) return;
            await preloadImage(lateUrl);
            if (runId !== runIdRef.current) return;
            setStandardGenError(null);
            setPremiumGenError(null);
            setUltraGenError(null);
            setOutput(lateUrl);
            setState(\"success\");
            setProgress(100);
            void refreshProfile();
            toast.success(\"Image ready\");
          })
          .catch(() => {
            /* server failed after client timeout — refund is handled server-side */
          });
      }
    } finally {
      progressTimers.forEach(clearTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const runGenerate = async () => {"""

if basic_catch not in ie:
    raise SystemExit("catch block not found")
ie = ie.replace(basic_catch, new_catch, 1)

if "export function ImageEditor" not in ie or "ImageEditor stub" in ie:
    raise SystemExit("integrity fail")
if ie.count("{") != ie.count("}"):
    raise SystemExit(f"brace mismatch {ie.count('{')} {ie.count('}')}")
if "inFlightGenRef" not in ie or "clientTimedOut && genPromise" not in ie:
    raise SystemExit("hardening markers missing")

path.write_text(ie, encoding="utf-8")
print(f"hardened ImageEditor size={path.stat().st_size}")
