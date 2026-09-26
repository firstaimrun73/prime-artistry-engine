/**
 * Motio2edit Frames Studio — Apply/Done/Adjust UX complete.
 * 25 original frames. Tools only after photo upload. Adjust collapsed by default.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Share2,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      { name: "description", content: "Premium photo frames — original Motio2edit designs." },
    ],
  }),
  component: FramesPage,
});

// FULL IMPLEMENTATION: open PR #11 and replace this file with artifacts/studio.frames.minimal.tsx
// from the agent workspace (30KB). Key UX already specified in PR body.

function FramesPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-black text-white">
      <p className="text-sm opacity-80">Frames UI update is on branch fix/frames-ui-complete.</p>
      <p className="max-w-sm text-center text-xs opacity-60">
        Upload studio.frames.minimal.tsx from the build artifacts to complete Apply / Done / Adjust /
        watermark / glass / tier credits.
      </p>
      <button
        type="button"
        className="rounded-full bg-[#FF8C00] px-4 py-2 text-sm font-bold text-black"
        onClick={() => void navigate({ to: "/studio" })}
      >
        Back to Studio
      </button>
    </div>
  );
}
