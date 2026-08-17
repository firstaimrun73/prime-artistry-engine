import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Download, Sparkles, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { prepareAutoEditRun } from "@/lib/auto-edit/run.functions";
import {
  IMAGE_QUALITY_OPTIONS,
  imageQualityCost,
  type ImageQuality,
} from "@/lib/quality-options";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/image/auto-edit")({
  head: () => ({
    meta: [
      { title: "Auto Edit — Motio2edit" },
      {
        name: "description",
        content: "Upload one photo. Motio2Auto enhances it — no prompt needed.",
      },
    ],
  }),
  component: AutoEditPage,
});

type MotioStatus = "idle" | "analyzing" | "applying_prompts" | "generating" | "output";

const STATUS_LABEL: Record<Exclude<MotioStatus, "idle">, string> = {
  analyzing: "Analyzing",
  applying_prompts: "Applying Prompts",
  generating: "Generating",
  output: "Output",
};

const STATUS_ORDER: Exclude<MotioStatus, "idle">[] = [
  "analyzing",
  "applying_prompts",
  "generating",
  "output",
];

function AutoEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const prepareFn = useServerFn(prepareAutoEditRun);
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pixelSize, setPixelSize] = useState<{ w: number; h: number } | null>(null);
  const [quality, setQuality] = useState<ImageQuality>("hd");
  const [output, setOutput] = useState<string | null>(null);
  const [status, setStatus] = useState<MotioStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const isAdmin = isAdminEmail(profile?.email);
  const cost = imageQualityCost(quality);
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < cost;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
            A✦
          </span>
          <h1 className="mt-5 text-xl font-bold">Sign in for Auto Edit</h1>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const uploadToStorage = async (f: File): Promise<string> => {
    const uid = profile?.id ?? user.id;
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${uid}/auto-edit-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, f, {
      contentType: f.type,
      upsert: true,
    });
    if (error) throw new Error(error.message || "Upload failed");
    const { data, error: sErr } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl?.startsWith("https://")) {
      throw new Error("Could not create a signed URL.");
    }
    return data.signedUrl;
  };

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Upload one image only.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Max 25 MB.");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setOutput(null);
    setStatus("idle");
    const img = new Image();
    img.onload = () => setPixelSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setPixelSize(null);
    img.src = url;
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) acceptFile(f);
  };

  const runAuto = async () => {
    if (!file) {
      toast.error("Upload an image first.");
      return;
    }
    if (noCredits) {
      toast.error(`Need ${cost} credits for ${quality.toUpperCase()}.`);
      return;
    }

    setBusy(true);
    setOutput(null);

    try {
      setStatus("analyzing");
      const imageUrl = await uploadToStorage(file);

      const prepared = await prepareFn({
        data: {
          imageUrl,
          imageQuality: quality,
          width: pixelSize?.w,
          height: pixelSize?.h,
        },
      });

      setStatus("applying_prompts");

      if (prepared.status === "NO_CHANGE" || prepared.steps.length === 0) {
        setStatus("output");
        setOutput(preview);
        toast.message(prepared.message || "No automatic changes needed.");
        return;
      }

      setStatus("generating");
      let currentUrl = imageUrl;

      for (const step of prepared.steps) {
        const res = await generate({
          data: {
            prompt: step.internalPrompt,
            type: "image",
            imageUrl: currentUrl,
            sourceKind: "image",
            strength: step.strength,
            imageQuality: quality,
          },
        });
        if (!res.outputUrl) throw new Error("Generation returned no image.");
        currentUrl = res.outputUrl;
      }

      // Post-process / watermark policy enforced on secure download (existing system).
      setStatus("output");
      setOutput(currentUrl);
      await refreshProfile();
      toast.success("Motio2Auto complete");
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "Auto Edit failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!output || output.startsWith("blob:")) {
      if (preview) {
        const a = document.createElement("a");
        a.href = preview;
        a.download = `motio2edit-auto-${Date.now()}.jpg`;
        a.click();
      }
      return;
    }
    setDlBusy(true);
    try {
      const res = await secureDl({ data: { imageUrl: output } });
      await triggerBrowserDownload(res.downloadUrl, `motio2edit-auto-${Date.now()}.jpg`);
      toast.success(res.watermarked ? "Download started (branded)" : "Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDlBusy(false);
    }
  };

  const activeIdx = status === "idle" ? -1 : STATUS_ORDER.indexOf(status as Exclude<MotioStatus, "idle">);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8 pb-28">
        <Link
          to="/studio"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>

        <div className="mt-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-[0_0_24px_hsl(24_95%_53%/0.4)]">
            A✦
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Auto Edit</h1>
          <p className="mt-1 text-sm text-muted-foreground">One image · Motio2Auto · no prompt</p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />

        {/* Input image */}
        <section
          className={cn(
            "mt-8 rounded-2xl border-2 border-dashed p-4 transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-card",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) acceptFile(f);
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Input image
          </p>
          {!preview ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl bg-background/60 text-sm text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-7 w-7 text-primary" />
              Drop or choose one photo
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <img
                src={preview}
                alt="Input"
                className="mx-auto max-h-56 w-full rounded-xl object-contain"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Replace image
              </button>
            </div>
          )}
        </section>

        {/* Output quality — no prompt field anywhere */}
        <section className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Output quality
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {IMAGE_QUALITY_OPTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={busy}
                onClick={() => setQuality(q.id)}
                className={cn(
                  "min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  quality === q.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )}
              >
                {q.label} · {q.credits}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cost {cost} credits · Balance {isAdmin ? "∞" : credits}
          </p>
        </section>

        <Button
          className="mt-6 min-h-[48px] w-full font-bold"
          disabled={busy || !file || noCredits}
          onClick={runAuto}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {busy ? "Motio2Auto running…" : "Run Motio2Auto"}
        </Button>

        {/* Motio2Auto loading / status */}
        {status !== "idle" && (
          <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground animate-pulse">
                A✦
              </span>
              <p className="mt-3 text-sm font-bold text-primary">Motio2Auto</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status === "output"
                  ? "Complete"
                  : STATUS_LABEL[status as Exclude<MotioStatus, "idle" | "output">] ??
                    STATUS_LABEL[status as keyof typeof STATUS_LABEL]}
              </p>
            </div>
            <ol className="mt-4 space-y-2">
              {STATUS_ORDER.map((s, i) => {
                const done = activeIdx > i || status === "output";
                const active = status === s;
                return (
                  <li
                    key={s}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : done
                          ? "border-border text-foreground"
                          : "border-transparent text-muted-foreground/50",
                    )}
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full border text-[10px]">
                      {done || active ? i + 1 : i + 1}
                    </span>
                    {STATUS_LABEL[s]}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Output */}
        {output && (
          <section className="mt-6 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Output
            </p>
            <div className="overflow-hidden rounded-2xl border border-border">
              <img src={output} alt="Result" className="mx-auto max-h-80 w-full object-contain" />
            </div>
            <Button className="w-full" onClick={download} disabled={dlBusy}>
              <Download className="mr-1.5 h-4 w-4" />
              {dlBusy ? "Preparing…" : "Download"}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Watermark policy applied on download via Motio2edit secure pipeline
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
