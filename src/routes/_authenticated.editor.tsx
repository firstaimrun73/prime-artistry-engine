import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Sparkles, Download, Lock, Image as ImageIcon, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor")({
  component: Editor;
});

type GenState = "idle" | "loading" | "success" | "blocked";

function Editor() {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [state, setState] = useState<GenState>("idle");

  if (!profile) return null;
  const plan = getPlan(profile.plan);
  const noCredits = profile.credits <= 0;
  const videoLocked = mediaType === "video" && !plan.video;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setInputPreview(url);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    if (videoLocked) {
      setState("blocked");
      return toast.error("Video generation requires a paid plan.");
    }
    if (noCredits) {
      setState("blocked");
      return toast.error("You're out of credits.");
    }
    setState("loading");
    setOutput(null);
    try {
      const res = await generate({ data: { prompt, type: mediaType } });
      setOutput(res.outputUrl);
      setState("success");
      await refreshProfile();
      toast.success("Done!");
    } catch (err) {
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const a = document.createElement("a");
    a.href = output;
    a.download = `motio2edit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editor</h1>
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
          {profile.credits} credits
        </span>
      </div>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => { setMediaType("image"); setState("idle"); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mediaType === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Image
        </button>
        <button
          onClick={() => { setMediaType("video"); setState("idle"); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mediaType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Video className="h-4 w-4" /> Video
          {!plan.video && <Lock className="h-3 w-3" />}
        </button>
      </div>

      {videoLocked && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <span className="text-destructive-foreground">Video generation is a paid feature.</span>
          <Button asChild size="sm">
            <Link to="/pricing">Upgrade</Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept={mediaType === "image" ? "image/*" : "video/*"}
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={videoLocked}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground transition-colors hover:border-primary disabled:opacity-50"
          >
            <Upload className="h-6 w-6" />
            Upload {mediaType} (optional)
          </button>

          <Textarea
            placeholder={`Describe the ${mediaType} you want…`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={state === "loading" || videoLocked || noCredits}
          >
            {state === "loading" ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" /> Generate
              </>
            )}
          </Button>
          {noCredits && (
            <p className="text-center text-xs text-destructive-foreground">
              Out of credits — <Link to="/pricing" className="underline">get more</Link>.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              {inputPreview ? (
                mediaType === "image" ? (
                  <img src={inputPreview} alt="input" className="h-full w-full object-cover" />
                ) : (
                  <video src={inputPreview} className="h-full w-full object-cover" controls />
                )
              ) : (
                <span className="text-xs text-muted-foreground">No upload</span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">After</p>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              {state === "loading" ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : output ? (
                <img src={output} alt="output" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Output appears here</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-6"
        onClick={handleDownload}
        disabled={!output || state === "loading"}
      >
        <Download className="mr-1.5 h-4 w-4" /> Download output
      </Button>
    </div>
  );
}
