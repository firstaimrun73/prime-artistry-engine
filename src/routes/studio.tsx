/**
 * Unified Studio — Image | Video | Music
 * BUILD_MARKER: 2026-11-17-unblank-v4-FORCE
 *
 * CRITICAL: production was stuck on `export { e as component }` where e=()=>null.
 * This file must never export a null component.
 */
import { useState, useRef, type ChangeEvent } from "react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Header } from "@/components/Header";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  ArrowUp,
  Paperclip,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";

function StudioPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") {
    return <Outlet />;
  }
  return <StudioWorkspace />;
}

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Create images, video, and music with Motio2edit Studio.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioPage,
});

type StudioMode = "image" | "video" | "music";

function StudioWorkspace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk =
    admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk =
    admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const credits = profile?.credits ?? 0;

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mode === "image" && !file.type.startsWith("image/")) return;
    if (
      mode === "video" &&
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      return;
    }
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
    const trimmed = prompt.trim();
    if (mode === "video") {
      if (trimmed) {
        try {
          sessionStorage.setItem(
            "motio2edit-preset",
            JSON.stringify({ prompt: trimmed, mode: "video" }),
          );
        } catch {
          /* ignore */
        }
      }
      if (!videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      navigate({ to: "/studio/video" });
      return;
    }
    if (mode === "music") {
      if (trimmed) {
        try {
          sessionStorage.setItem(
            "motio2edit-preset",
            JSON.stringify({ prompt: trimmed, mode: "music" }),
          );
        } catch {
          /* ignore */
        }
      }
      if (!musicOk) {
        navigate({ to: "/pricing" });
        return;
      }
      navigate({ to: "/music" });
      return;
    }
    if (trimmed) {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({ prompt: trimmed, mode: "image" }),
        );
      } catch {
        /* ignore */
      }
      navigate({
        to: "/editor",
        search: { prompt: trimmed } as never,
      });
      return;
    }
    navigate({ to: "/editor" });
  };

  const modes = [
    { id: "image" as const, icon: ImageIcon, label: "Image", ok: true },
    { id: "video" as const, icon: Video, label: "Video", ok: videoOk },
    { id: "music" as const, icon: Music, label: "Music", ok: musicOk },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Motio2edit
            </p>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Studio
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold tabular-nums"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        <div className="mb-4 flex items-center gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
          {modes.map(({ id, icon: Icon, label, ok }) => {
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
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition sm:text-sm",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                  !ok && "opacity-60",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {!ok ? <Lock className="h-3 w-3 opacity-70" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex-1">
          <p className="text-sm text-muted-foreground">
            {mode === "image"
              ? "Type a prompt or attach a photo to edit."
              : mode === "video"
                ? "Describe the scene, then generate."
                : "Describe a song or instrumental."}
          </p>
          {preview ? (
            <img
              src={preview}
              alt="Attachment preview"
              className="mt-4 h-24 w-24 rounded-xl object-cover ring-1 ring-border"
            />
          ) : null}
        </div>

        <div className="mt-auto pt-2">
          <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-lg backdrop-blur-xl">
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={onAttach}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Attach file"
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
          <p className="mt-2 text-center text-[10px] text-muted-foreground/80">
            Credits apply on generate · BUILD 2026-11-17-unblank-v4
          </p>
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
