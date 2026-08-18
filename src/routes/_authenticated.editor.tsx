/**
 * Authenticated /editor entry — selects Image or Video workspace once,
 * then mounts a single independent editor core.
 *
 * Does not own image/video domain state or generation UI.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImageEditor } from "@/components/editor/image/ImageEditor";
import { VideoEditor } from "@/components/editor/video/VideoEditor";
import type { EditorBootstrap, EditorWorkspace } from "@/components/editor/editor-bootstrap";

export const Route = createFileRoute("/_authenticated/editor")({
  component: EditorEntry,
});

function readBootstrap(): EditorBootstrap | null {
  try {
    let workspace: EditorWorkspace = "image";
    let initialPrompt: string | undefined;
    let pendingSmartRemove = false;
    let reuseUrl: string | undefined;
    let reuseKind: "image" | "video" | undefined;
    let hasContext = false;

    const reuseRaw = sessionStorage.getItem("motio2edit-reuse");
    if (reuseRaw) {
      sessionStorage.removeItem("motio2edit-reuse");
      const parsed = JSON.parse(reuseRaw) as { url?: string; kind?: "image" | "video" };
      if (parsed.url) {
        hasContext = true;
        reuseUrl = parsed.url;
        reuseKind = parsed.kind === "video" ? "video" : "image";
        workspace = reuseKind;
      }
    }

    const presetRaw = sessionStorage.getItem("motio2edit-preset");
    if (presetRaw) {
      sessionStorage.removeItem("motio2edit-preset");
      hasContext = true;
      const parsed = JSON.parse(presetRaw) as {
        prompt?: string;
        mode?: "image" | "video";
        smartRemove?: boolean;
      };
      if (parsed.mode === "image" || parsed.mode === "video") workspace = parsed.mode;
      if (typeof parsed.prompt === "string" && parsed.prompt.length > 0) {
        initialPrompt = parsed.prompt;
      }
      if (parsed.smartRemove) pendingSmartRemove = true;
    }

    const mode = sessionStorage.getItem("motio2edit-mode");
    if (mode === "image" || mode === "video") {
      hasContext = true;
      workspace = mode;
      sessionStorage.removeItem("motio2edit-mode");
    }

    if (!hasContext) return null;

    return {
      workspace,
      initialPrompt,
      reuseUrl,
      reuseKind,
      pendingSmartRemove: pendingSmartRemove || undefined,
    };
  } catch {
    return null;
  }
}

function EditorEntry() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState<EditorBootstrap | null | undefined>(undefined);

  useEffect(() => {
    const b = readBootstrap();
    if (!b) {
      navigate({ to: "/studio/image" });
      setBootstrap(null);
      return;
    }
    setBootstrap(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Still resolving session entry
  if (bootstrap === undefined) return null;
  // Redirecting away
  if (bootstrap === null) return null;

  if (bootstrap.workspace === "video") {
    return <VideoEditor bootstrap={bootstrap} />;
  }
  return <ImageEditor bootstrap={bootstrap} />;
}
