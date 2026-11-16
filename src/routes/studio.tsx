import { useState, useRef, type ChangeEvent } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Image as ImageIcon, Video, Music, Coins, ArrowUp, Paperclip, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      { name: "description", content: "Create images, video, and music with Motio2edit." },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

type StudioMode = "image" | "video" | "music";

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <UnifiedAiStudio />;
}

function UnifiedAiStudio() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk = admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const credits = profile?.credits ?? 0;

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mode === "image" && !file.type.startsWith("image/")) return;
    if (mode === "video" && !file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const onAttach = () => {
    if (mode === "video" && !videoOk) {
      navigate({ to: "/pricing" });
      return;
    }
    if (mode === "music" && !musicOk) {
      navigate({ to: "/pricing" });
      return;
    }
    fileInputRef.current?.click();
  };

  const onGenerate = () => {
    if (mode === "video") {
      if (prompt.trim()) {
        try {
          sessionStorage.setItem(
            "motio2edit-preset",
            JSON.stringify({ prompt: prompt.trim(), mode: "video" }),
          );
        } catch {}
      }
      navigate({ to: "/studio/video" });
      return;
    }
    if (mode === "music") {
      if (prompt.trim()) {
        try {
          sessionStorage.setItem(
            "motio2edit-preset",
            JSON.stringify({ prompt: prompt.trim(), mode: "music" }),
          );
        } catch {}
      }
      navigate({ to: "/music" });
      return;
    }
    if (prompt.trim()) {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({ prompt: prompt.trim(), mode: "image" }),
        );
      } catch {}
    }
    navigate({ to: "/studio/image/auto-edit" });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-4 pt-3 sm:px-4">
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Studio
            </h1>
            <button
              type="button"
              onClick={() => navigate({ to: "/profile" })}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold tabular-nums"
            >
              <Coins className="h-3 w-3 text-amber-500" />
              {credits.toLocaleString()}
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
            {(
              [
                { id: "image" as const, icon: ImageIcon, label: "Image Studio", ok: true },
                { id: "video" as const, icon: Video, label: "Video Studio", ok: videoOk },
                { id: "music" as const, icon: Music, label: "Music Studio", ok: musicOk },
              ] as const
            ).map(({ id, icon: Icon, label, ok }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (!ok) {
                      navigate({ to: "/pricing" });
                      return;
                    }
                    setMode(id);
                    if (preview) {
                      URL.revokeObjectURL(preview);
                      setPreview(null);
                    }
                  }}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                    !ok && "opacity-60",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  {!ok && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {mode === "image"
              ? "Create something new"
              : mode === "video"
                ? "Create a cinematic scene"
                : "Compose your sound"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {mode === "image"
              ? "Type a prompt or attach a photo to edit."
              : mode === "video"
                ? "Describe the scene, then generate."
                : "Describe a song or instrumental."}
          </p>
          {preview && (
            <img
              src={preview}
              alt="Attachment"
              className="mt-4 h-24 w-24 rounded-xl object-cover ring-1 ring-border"
            />
          )}
        </div>

        <div className="mt-auto pt-3">
          <div className="rounded-2xl border border-border bg-card/70 p-2 shadow-lg backdrop-blur-xl">
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={onAttach}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Attach"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onGenerate();
                  }
                }}
                placeholder={
                  mode === "image"
                    ? "Describe what you want to create…"
                    : mode === "video"
                      ? "Describe a video scene…"
                      : "Describe a song or instrumental…"
                }
                rows={2}
                className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={onGenerate}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow transition hover:opacity-90"
                aria-label="Generate"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "image" ? "image/*" : "image/*,video/*"}
          className="hidden"
          aria-hidden
          onChange={onFileChange}
        />
      </main>
    </div>
  );
}
