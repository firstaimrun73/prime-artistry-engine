import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Coins, Download, Layers, Plus, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { generateMedia } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  IMAGE_QUALITY_OPTIONS,
  type ImageQuality,
} from "@/lib/quality-options";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  MULTI_IMAGE_MODELS,
  MULTI_IMAGE_OUTPUT_OPTIONS,
  buildMultiImageGeneratePayload,
  estimateMultiImageCredits,
  getMultiImageEligibility,
  pickDefaultModel,
  type MultiImageModelId,
  type MultiImageOutputCount,
} from "@/lib/multi-image";
import { MultiImageLocked } from "./MultiImageLocked";
import { cn } from "@/lib/utils";

const MAX_FILE_MB = 25;

type Slot = { id: string; preview: string; file: File | null; dataUrl: string | null };

/**
 * Dedicated Multi-Image feature UI (not the main editor gallery).
 * Order: inputs → outputs → model → quality → size → prompt → generate.
 */
export function MultiImageFeature() {
  const { user, profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = isAdminEmail(profile?.email);
  const eligibility = getMultiImageEligibility(profile?.plan, isAdmin);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [outputCount, setOutputCount] = useState<MultiImageOutputCount>(1);
  const [modelId, setModelId] = useState<MultiImageModelId>("kontext-multi");
  const [quality, setQuality] = useState<ImageQuality>("hd");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [outputs, setOutputs] = useState<string[]>([]);

  const maxSlots = eligibility.maxImages;

  const creditEstimate = useMemo(
    () =>
      estimateMultiImageCredits({
        quality,
        requestedOutputCount: outputCount,
        modelId,
        inputCount: slots.length,
      }),
    [quality, outputCount, modelId, slots.length],
  );

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Sign in to use Multi-Image.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!eligibility.allowed) {
    return <MultiImageLocked variant="card" />;
  }

  const readDataUrl = (file: File) =>
    new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Logic gate (not UI-only): Free never reaches here because of eligibility.allowed
    if (!eligibility.allowed) {
      toast.error(eligibility.reason ?? "Multi-Image requires a paid plan.");
      e.target.value = "";
      return;
    }
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    const room = maxSlots - slots.length;
    if (room <= 0) {
      toast.message(`Your plan allows up to ${maxSlots} images.`);
      return;
    }
    const accepted: File[] = [];
    for (const f of files.slice(0, room)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name} exceeds ${MAX_FILE_MB} MB.`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    const next: Slot[] = await Promise.all(
      accepted.map(async (f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        preview: URL.createObjectURL(f),
        file: f,
        dataUrl: await readDataUrl(f),
      })),
    );
    setSlots((prev) => [...prev, ...next].slice(0, maxSlots));
    const total = Math.min(slots.length + next.length, maxSlots);
    setModelId(pickDefaultModel(total).id);
    toast.success(next.length > 1 ? `${next.length} images added` : "Image added");
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => {
      const n = prev.filter((s) => s.id !== id);
      setModelId(pickDefaultModel(n.length || 1).id);
      return n;
    });
  };

  const uploadOne = async (file: File): Promise<string> => {
    const uid = profile?.id ?? user.id;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/multi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (error) throw new Error(error.message || "Upload failed");
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl?.startsWith("https://")) {
      throw new Error("Could not create signed URL.");
    }
    return data.signedUrl;
  };

  const runGenerate = async () => {
    if (!eligibility.allowed) {
      toast.error(eligibility.reason ?? "Multi-Image requires a paid plan.");
      return;
    }
    if (slots.length === 0) return toast.error("Add at least one image.");
    if (!prompt.trim()) return toast.error("Enter a prompt.");

    const cost = creditEstimate.estimatedCredits;
    if (!isAdmin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits. Estimated cost: ${cost}.`);
      return;
    }

    setBusy(true);
    setOutputs([]);
    try {
      const uploaded: string[] = [];
      for (const slot of slots) {
        if (slot.file) {
          uploaded.push(await uploadOne(slot.file));
        } else if (slot.dataUrl?.startsWith("https://")) {
          uploaded.push(slot.dataUrl);
        } else if (slot.dataUrl) {
          const res = await fetch(slot.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `multi-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
          uploaded.push(await uploadOne(file));
        }
      }

      const built = buildMultiImageGeneratePayload(
        {
          imageSources: slots.map((s) => s.preview),
          inputCount: slots.length,
          outputCount,
          modelId,
          quality,
          aspectRatio,
          prompt,
        },
        uploaded,
      );

      if (!built.ok) {
        toast.error(built.error);
        return;
      }
      for (const w of built.warnings) toast.message(w);

      // Existing server path: one output. Loop only if executable count > 1 becomes available later.
      const results: string[] = [];
      const runs = creditEstimate.executableOutputCount;
      for (let i = 0; i < runs; i++) {
        const res = await generate({
          data: {
            prompt: built.payload.prompt,
            type: "image",
            imageUrl: built.payload.imageUrl,
            sourceKind: "image",
            referenceImageUrls: built.payload.referenceImageUrls,
            imageQuality: built.payload.imageQuality,
          },
        });
        if (res.outputUrl) results.push(res.outputUrl);
      }
      setOutputs(results);
      await refreshProfile();
      toast.success(results.length > 1 ? `${results.length} results ready` : "Result ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Input images */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1. Input images
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFiles}
        />
        <div className="flex flex-wrap gap-2">
          {slots.map((s, i) => (
            <div key={s.id} className="relative h-20 w-20">
              <img src={s.preview} alt={`Input ${i + 1}`} className="h-full w-full rounded-lg object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                {i === 0 ? "Primary" : `Ref ${i}`}
              </span>
              <button
                type="button"
                aria-label="Remove"
                disabled={busy}
                onClick={() => removeSlot(s.id)}
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {slots.length < maxSlots && (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="grid h-20 w-20 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {slots.length}/{maxSlots} images · first is primary · rest are references
        </p>
        {slots.length === 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground hover:border-primary"
          >
            <Upload className="h-6 w-6" />
            Upload 2+ images for multi-reference edits
          </button>
        )}
      </section>

      {/* 2. Output count */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          2. Output configuration
        </p>
        <div className="flex flex-wrap gap-2">
          {MULTI_IMAGE_OUTPUT_OPTIONS.map((o) => (
            <button
              key={o.count}
              type="button"
              disabled={busy || !o.supportedToday}
              title={o.supportedToday ? undefined : "Not supported by current FAL path yet"}
              onClick={() => o.supportedToday && setOutputCount(o.count)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                outputCount === o.count && o.supportedToday
                  ? "border-primary bg-primary/10 text-primary"
                  : o.supportedToday
                    ? "border-border bg-card text-muted-foreground hover:border-primary"
                    : "cursor-not-allowed border-border bg-secondary/40 text-muted-foreground opacity-60",
              )}
            >
              {o.label}
              {!o.supportedToday ? " · soon" : ""}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Current pipeline produces 1 image per job (Kontext / Kontext Multi).
        </p>
      </section>

      {/* 3. Model */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          3. Model
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MULTI_IMAGE_MODELS.filter((m) => m.available).map((m) => {
            const disabledModel =
              busy || (m.id === "kontext-multi" && slots.length < 2) || (m.id === "kontext-single" && slots.length > 1);
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabledModel && modelId !== m.id}
                onClick={() => setModelId(m.id)}
                className={cn(
                  "rounded-xl border p-3 text-left text-xs transition-colors",
                  modelId === m.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <span className="font-semibold">{m.label}</span>
                <span className="mt-1 block text-muted-foreground">{m.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Quality */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          4. Quality
        </p>
        <div className="flex flex-wrap gap-2">
          {IMAGE_QUALITY_OPTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={busy}
              onClick={() => setQuality(q.id)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold",
                quality === q.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary",
              )}
            >
              {q.label} · {q.credits}
            </button>
          ))}
        </div>
      </section>

      {/* 5. Aspect (UI; edit path keeps source framing today) */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          5. Image size / aspect ratio
        </p>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={() => setAspectRatio(a.id)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium",
                aspectRatio === a.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Aspect is stored for the product API; image-edit currently preserves source framing.
        </p>
      </section>

      {/* 6–7. Prompt */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          6. Prompt
        </p>
        <Textarea
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder="Describe how to combine or edit these images (e.g. outfit from image 2 on the person in image 1)…"
          className="min-h-[100px] resize-none"
        />
        <p className="text-[11px] text-muted-foreground">{prompt.length}/2000</p>
      </section>

      {/* Credits + generate */}
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold">
          <Coins className="h-3.5 w-3.5 text-primary" />
          Estimated cost: {creditEstimate.estimatedCredits} credits
        </div>
        <p className="mt-1 text-muted-foreground">{creditEstimate.note}</p>
        <p className="text-muted-foreground">
          Balance: {isAdmin ? "∞" : (profile?.credits ?? 0)}
        </p>
      </div>

      <Button className="min-h-[48px] w-full" disabled={busy || slots.length === 0} onClick={runGenerate}>
        <Sparkles className="mr-1.5 h-4 w-4" />
        {busy ? "Generating…" : "Generate"}
      </Button>

      {outputs.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Results
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {outputs.map((url, i) => (
              <div key={url + i} className="overflow-hidden rounded-xl border border-border bg-card">
                <img src={url} alt={`Output ${i + 1}`} className="w-full object-contain" />
                <div className="p-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `motio2edit-multi-${Date.now()}-${i + 1}.png`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download {i + 1}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        Multi-Image feature module — separate from the main editor gallery.
      </p>
    </div>
  );
}
