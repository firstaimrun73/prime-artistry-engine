/**
 * Cropmix — /studio/cropmix
 * Crop mode + Collage mode. Theme-aware chrome; dark canvas.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Crop, LayoutGrid, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { CropEditor } from "@/components/cropmix/CropEditor";
import { CollageEditor } from "@/components/cropmix/CollageEditor";
import { CropmixOutput } from "@/components/cropmix/CropmixOutput";
import { CROPMIX_VOLT, type CropGeometry, type CropmixMode } from "@/lib/cropmix/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/cropmix")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cropmix — Motio2edit" },
      {
        name: "description",
        content:
          "Crop and collage photos in Motio2edit Cropmix — free crop tools and AI+ collage styles.",
      },
    ],
  }),
  component: CropmixPage,
});

type CropSession = { file: File; geometry?: CropGeometry };
type OutputSession = {
  mode: "crop" | "collage";
  dataUrl: string;
  width: number;
  height: number;
  watermarked: boolean;
  creditsCharged: number;
};

function CropmixPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  useTheme();
  const [view, setView] = useState<CropmixMode>("picker");
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [output, setOutput] = useState<OutputSession | null>(null);
  const cropInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: "/studio/cropmix" } });
    }
  }, [loading, user, navigate]);

  const startCrop = useCallback((file: File) => {
    setCropSession({ file });
    setView("crop");
  }, []);

  const onCropApply = (
    dataUrl: string,
    geometry: CropGeometry,
    width: number,
    height: number,
  ) => {
    setCropSession((s) => (s ? { ...s, geometry } : s));
    setOutput({
      mode: "crop",
      dataUrl,
      width,
      height,
      watermarked: false,
      creditsCharged: 0,
    });
    setView("output");
  };

  const onCollageResult = (
    dataUrl: string,
    width: number,
    height: number,
    creditsCharged: number,
  ) => {
    setOutput({
      mode: "collage",
      dataUrl,
      width,
      height,
      watermarked: true,
      creditsCharged,
    });
    setView("output");
  };

  const resetAll = () => {
    setCropSession(null);
    setOutput(null);
    setView("picker");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (view === "crop" && cropSession) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-background">
        <CropEditor
          file={cropSession.file}
          initialGeometry={cropSession.geometry}
          onApply={onCropApply}
          onCancel={() => setView("picker")}
        />
      </div>
    );
  }

  if (view === "collage") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-background">
        <CollageEditor
          onResult={onCollageResult}
          onCancel={() => setView("picker")}
        />
      </div>
    );
  }

  if (view === "output" && output) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-background">
        <CropmixOutput
          mode={output.mode}
          dataUrl={output.dataUrl}
          width={output.width}
          height={output.height}
          watermarked={output.watermarked}
          creditsCharged={output.creditsCharged}
          onEditAgain={() => {
            if (output.mode === "crop" && cropSession) {
              setView("crop");
            } else {
              setView("collage");
            }
          }}
          onStartNew={resetAll}
          onClose={() => navigate({ to: "/" })}
        />
      </div>
    );
  }

  // Picker
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio<span className="text-[#FF5A1F]">2</span>edit
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">Cropmix</h1>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Crop a single photo or build a collage from up to 10 images.
        </p>

        <div className="grid w-full max-w-sm gap-3">
          <button
            type="button"
            onClick={() => cropInputRef.current?.click()}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-xl text-black"
              style={{ backgroundColor: CROPMIX_VOLT }}
            >
              <Crop className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Crop</span>
              <span className="block text-xs text-muted-foreground">
                Free · presets · EXIF-aware · no watermark
              </span>
            </span>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => setView("collage")}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-xl text-black"
              style={{ backgroundColor: CROPMIX_VOLT }}
            >
              <LayoutGrid className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Collage</span>
              <span className="block text-xs text-muted-foreground">
                10 styles · common free · AI+ 10 credits
              </span>
            </span>
          </button>
        </div>
      </main>

      <input
        ref={cropInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) startCrop(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
