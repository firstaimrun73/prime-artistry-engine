/**
 * Legacy /editor entry — redirects into the unified Motion2AI workspace.
 * Preserves session bootstrap (mode / prompt / reuse) when present.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor")({
  component: EditorRedirect,
});

function EditorRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let mode: "image" | "video" = "image";
    try {
      const reuseRaw = sessionStorage.getItem("motio2edit-reuse");
      if (reuseRaw) {
        const parsed = JSON.parse(reuseRaw) as { kind?: "image" | "video" };
        if (parsed.kind === "video") mode = "video";
      }
      const presetRaw = sessionStorage.getItem("motio2edit-preset");
      if (presetRaw) {
        const parsed = JSON.parse(presetRaw) as { mode?: "image" | "video" };
        if (parsed.mode === "video") mode = "video";
      }
      const stored = sessionStorage.getItem("motio2edit-mode");
      if (stored === "video") mode = "video";
      if (stored === "image") mode = "image";
    } catch {
      /* ignore */
    }
    void navigate({ to: "/motion2ai", search: { mode }, replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Opening Motion2AI" />
    </div>
  );
}
