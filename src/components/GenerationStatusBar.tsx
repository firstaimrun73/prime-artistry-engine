import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useGenerationStatus, type GenerationKind } from "@/lib/generation-status";

const LABELS: Record<GenerationKind, { emoji: string; noun: string }> = {
  image: { emoji: "⚡", noun: "image" },
  video: { emoji: "🎬", noun: "video" },
  music: { emoji: "🎵", noun: "music" },
};

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Fixed floating bar shown while any editor is generating. Sits above the
 * mobile bottom tab bar. Tap to jump back to the originating editor.
 */
export function GenerationStatusBar() {
  const status = useGenerationStatus();
  const router = useRouter();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!status) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (!status) return null;
  const { emoji, noun } = LABELS[status.kind];
  const elapsed = formatElapsed(now - status.startedAt);
  const onCurrent = router.state.location.pathname === status.editorPath;

  return (
    <button
      type="button"
      onClick={() => {
        if (!onCurrent) router.navigate({ to: status.editorPath });
      }}
      aria-label={`Return to ${noun} editor`}
      className="fixed inset-x-0 z-40 mx-auto flex w-[90%] max-w-[400px] items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2.5 text-left shadow-lg backdrop-blur transition animate-pulse md:bottom-4"
      style={{
        bottom: "calc(72px + env(safe-area-inset-bottom))",
      }}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          Generating your {noun}... <span className="tabular-nums text-muted-foreground">{elapsed}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 animate-[genbar_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
      {!onCurrent && (
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Tap to open</span>
      )}
      <style>{`@keyframes genbar { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
    </button>
  );
}
