/**
 * Cropmix — /studio/cropmix
 * Crop only. Upload-first (Circle 2edit pattern). No collage entry.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { CropEditor } from "@/components/cropmix/CropEditor";
import { CropmixOutput } from "@/components/cropmix/CropmixOutput";
import type { CropGeometry } from "@/lib/cropmix/types";

export const Route = createFileRoute("/studio/cropmix")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cropmix — Motio2edit" },
      {
        name: "description",
        content: "Crop photos in Motio2edit Cropmix — free crop tools, presets, and custom ratios.",
      },
    ],
  }),
  component: CropmixPage,
});

type CropSession = { file: File; geometry?: CropGeometry };
type OutputSession = {
  dataUrl: string;
  width: number;
  height: number;
};

function CropmixPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  useTheme();
  const [view, setView] = useState<"edit" | "output">("edit");
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [output, setOutput] = useState<OutputSession | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: "/studio/cropmix" } });
    }
  }, [loading, user, navigate]);

  const onFile = useCallback((file: File) => {
    setCropSession({ file });
    setOutput(null);
    setView("edit");
  }, []);

  const onCropApply = (
    dataUrl: string,
    geometry: CropGeometry,
    width: number,
    height: number,
  ) => {
    setCropSession((s) => (s ? { ...s, geometry } : s));
    setOutput({ dataUrl, width, height });
    setView("output");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (view === "output" && output) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-background">
        <CropmixOutput
          dataUrl={output.dataUrl}
          width={output.width}
          height={output.height}
          onEditAgain={() => setView("edit")}
          onClose={() => navigate({ to: "/" })}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <CropEditor
        file={cropSession?.file ?? null}
        initialGeometry={cropSession?.geometry}
        onFile={onFile}
        onApply={onCropApply}
        onCancel={() => navigate({ to: "/" })}
      />
    </div>
  );
}
