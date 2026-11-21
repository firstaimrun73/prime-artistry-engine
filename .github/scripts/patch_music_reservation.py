#!/usr/bin/env python3
"""Surgical transform: reserve/refund + durable music_generation_jobs idempotency."""
from pathlib import Path

path = Path("src/lib/music.functions.ts")
m = path.read_text(encoding="utf-8")
if "reservationTxId" in m and "music_generation_jobs" in m:
    print("already patched")
    raise SystemExit(0)

old_pre = """    if (shouldCharge && (profile.credits ?? 0) < cost) {
      throw new Error(`Not enough credits. This music job costs ${cost} credits.`);
    }

    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!falKey && mode !== "voiceover") throw new Error("Music provider is not configured.");
"""

new_pre = r"""    if (shouldCharge && (profile.credits ?? 0) < cost) {
      throw new Error(`Not enough credits. This music job costs ${cost} credits.`);
    }

    // Durable idempotency: same (user, key) must not double-charge or double-call provider.
    const idempotencyKey = data.idempotencyKey ?? null;
    type MusicResultPayload = {
      outputUrl: string;
      videoUrl: string | null;
      credits: number;
      durationSeconds: number;
      durationRequested: number;
      model: string;
      mode: string;
      qualityTier: string;
      creditsCharged: number;
      trackTitle: string;
      outputType: "audio" | "video";
      originalAudioRemoved: boolean;
      pricingVersion: string;
    };
    let existingJob: {
      status?: string;
      result?: MusicResultPayload | null;
      reservation_tx_id?: string | null;
      updated_at?: string;
    } | null = null;

    if (idempotencyKey) {
      const { data: found } = await supabaseAdmin
        .from("music_generation_jobs")
        .select("status, result, reservation_tx_id, updated_at")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      existingJob = found as typeof existingJob;
      if (existingJob?.status === "succeeded" && existingJob.result && typeof existingJob.result === "object") {
        return existingJob.result as MusicResultPayload;
      }
      if (existingJob?.status === "pending") {
        const updatedMs = existingJob.updated_at ? Date.parse(existingJob.updated_at) : 0;
        if (updatedMs && Date.now() - updatedMs < 150_000) {
          throw new Error("This music generation is already in progress. Please wait.");
        }
      }
      if (!existingJob) {
        const { error: insErr } = await supabaseAdmin.from("music_generation_jobs").insert({
          user_id: userId,
          idempotency_key: idempotencyKey,
          status: "pending",
          credits_charged: shouldCharge ? cost : 0,
        });
        if (insErr) {
          const { data: raced } = await supabaseAdmin
            .from("music_generation_jobs")
            .select("status, result, reservation_tx_id, updated_at")
            .eq("user_id", userId)
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (raced?.status === "succeeded" && raced.result) {
            return raced.result as MusicResultPayload;
          }
          if (raced?.status === "pending") {
            throw new Error("This music generation is already in progress. Please wait.");
          }
        }
      } else if (existingJob.status === "failed" || existingJob.status === "pending") {
        await supabaseAdmin
          .from("music_generation_jobs")
          .update({ status: "pending", error_message: null, result: null, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("idempotency_key", idempotencyKey);
      }
    }

    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!falKey && mode !== "voiceover") throw new Error("Music provider is not configured.");

    // Reserve credits BEFORE provider call (same RPC contract as Image/Video).
    let reservationTxId: string | null = null;
    let newCredits = profile.credits ?? 0;
    if (shouldCharge && cost > 0) {
      const { data: debitData, error: debitErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost,
        _gen_type: "music",
        _user_id: userId,
      });
      if (debitErr) {
        if (String(debitErr.message || "").toLowerCase().includes("insufficient")) {
          throw new Error(`Not enough credits. This music job costs ${cost} credits.`);
        }
        throw new Error(debitErr.message || "Credit reservation failed.");
      }
      const txId =
        debitData && typeof debitData === "object" && "transaction_id" in (debitData as object)
          ? String((debitData as { transaction_id?: unknown }).transaction_id || "")
          : "";
      if (!txId) throw new Error("Credit reservation did not return a transaction_id.");
      reservationTxId = txId;
      if (debitData && typeof debitData === "object" && "credits" in (debitData as object)) {
        const c = (debitData as { credits?: unknown }).credits;
        if (typeof c === "number") newCredits = c;
      } else {
        newCredits = Math.max(0, (profile.credits ?? 0) - cost);
      }
      if (idempotencyKey) {
        await supabaseAdmin
          .from("music_generation_jobs")
          .update({ reservation_tx_id: reservationTxId, credits_charged: cost, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("idempotency_key", idempotencyKey);
      }
    }
"""

if old_pre not in m:
    raise SystemExit("pre-block not found")
m = m.replace(old_pre, new_pre, 1)

old_catch = """    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      throw new Error(`Music generation failed. Credits not charged. (${raw})`);
    }

    let newCredits = profile.credits ?? 0;
    if (shouldCharge) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: userId, p_amount: cost, p_reason: "music_generation",
      });
      if (dErr) {
        if (String(dErr.message || "").toLowerCase().includes("insufficient")) {
          throw new Error(`Not enough credits. This job costs ${cost} credits.`);
        }
        throw new Error(`Generation succeeded but credits could not be charged (${dErr.message}).`);
      }
      if (typeof deduction === "number") newCredits = deduction;
      else newCredits = Math.max(0, (profile.credits ?? 0) - cost);
    }

    const trackTitle = (brief.summaryPrompt || data.prompt || "Generated track").slice(0, 80);
"""

new_catch = r"""    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      if (reservationTxId) {
        try {
          const { data: refundData, error: refundErr } = await supabaseAdmin.rpc("refund_credits", {
            _transaction_id: reservationTxId,
            _user_id: userId,
          });
          if (refundErr) {
            console.error("[music] CRITICAL refund_credits RPC error", {
              tx: reservationTxId,
              userId,
              message: refundErr.message,
            });
          } else {
            const refunded =
              refundData &&
              typeof refundData === "object" &&
              (refundData as { refunded?: unknown }).refunded === true;
            if (refunded) {
              console.info("[music] reservation refund confirmed", { tx: reservationTxId });
              if (refundData && typeof (refundData as { credits?: unknown }).credits === "number") {
                newCredits = (refundData as { credits: number }).credits;
              }
            } else {
              console.warn("[music] refund not newly applied (already refunded or missing)", {
                tx: reservationTxId,
              });
            }
          }
        } catch (refundThrow) {
          console.error("[music] CRITICAL refund_credits threw", { tx: reservationTxId, err: refundThrow });
        }
      }
      if (idempotencyKey) {
        await supabaseAdmin
          .from("music_generation_jobs")
          .update({
            status: "failed",
            error_message: raw.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("idempotency_key", idempotencyKey);
      }
      throw new Error(`Music generation failed. Credits were not kept. (${raw})`);
    }

    const trackTitle = (brief.summaryPrompt || data.prompt || "Generated track").slice(0, 80);
"""

if old_catch not in m:
    raise SystemExit("catch block not found")
m = m.replace(old_catch, new_catch, 1)

old_return = """    return {
      outputUrl,
      videoUrl: outVideoUrl,
      credits: newCredits,
      durationSeconds: actualDurationSeconds,
      durationRequested: durationSeconds,
      model: quote.modelLabel,
      mode: quote.mode,
      qualityTier: quote.qualityTier,
      creditsCharged: shouldCharge ? cost : 0,
      trackTitle,
      outputType,
      originalAudioRemoved,
      pricingVersion: MUSIC_PRICING_VERSION,
    };
  });
"""

new_return = r"""    const resultPayload = {
      outputUrl,
      videoUrl: outVideoUrl,
      credits: newCredits,
      durationSeconds: actualDurationSeconds,
      durationRequested: durationSeconds,
      model: quote.modelLabel,
      mode: quote.mode,
      qualityTier: quote.qualityTier,
      creditsCharged: shouldCharge ? cost : 0,
      trackTitle,
      outputType,
      originalAudioRemoved,
      pricingVersion: MUSIC_PRICING_VERSION,
    };

    if (idempotencyKey) {
      await supabaseAdmin
        .from("music_generation_jobs")
        .update({
          status: "succeeded",
          result: resultPayload,
          reservation_tx_id: reservationTxId,
          credits_charged: shouldCharge ? cost : 0,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey);
    }

    return resultPayload;
  });
"""

if old_return not in m:
    raise SystemExit("return block not found")
m = m.replace(old_return, new_return, 1)

if m.count("{") != m.count("}"):
    raise SystemExit(f"brace mismatch {m.count('{')} {m.count('}')}")
path.write_text(m, encoding="utf-8")
print("patched music.functions.ts", path.stat().st_size)
