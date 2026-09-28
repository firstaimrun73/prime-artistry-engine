import { Lock, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  IMAGE_QUALITY_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
  type ImageQuality,
  type VideoResolution,
} from "@/lib/quality-options";
import {
  VIDEO_DURATIONS,
  VIDEO_ASPECT_RATIOS,
  videoCreditCost,
  isDurationAllowed,
  planRequiredForDuration,
  modelTierForDuration,
  MODEL_TIER_LABEL,
  MODEL_TIER_DESCRIPTION,
  type VideoDuration,
  type VideoAspectRatio,
} from "@/lib/video-options";
import {
  imageQualitiesForStudioTier,
  aspectRatiosForStudioTier,
  studioExperienceLabel,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

interface EditorOptionsPanelProps {
  mediaType: "image" | "video";
  loading: boolean;
  inputDataUrl: string | null;
  aspectRatio: AspectRatio;
  setAspectRatio: (a: AspectRatio) => void;
  imageQuality: ImageQuality;
  setImageQuality: (q: ImageQuality) => void;
  strength: number;
  setStrength: (n: number) => void;
  canAddRefImages: boolean;
  refImages: string[];
  setRefImages: (imgs: string[]) => void;
  userPlan: string;
  videoDuration: VideoDuration;
  setVideoDuration: (d: VideoDuration) => void;
  videoAspect: VideoAspectRatio;
  setVideoAspect: (a: VideoAspectRatio) => void;
  videoResolution: VideoResolution;
  setVideoResolution: (r: VideoResolution) => void;
  cost: number;
  isAdmin: boolean;
  credits: number;
  keepWatermark: boolean;
  setKeepWatermark: React.Dispatch<React.SetStateAction<boolean>>;
  isFree: boolean;
  studioTier?: StudioTier;
}

/** Compact shape preview — proportions match the real aspect ratio. */
function AspectShape({ id }: { id: string }) {
  const dims: Record<string, { w: number; h: number }> = {
    "1:1": { w: 18, h: 18 },
    "4:3": { w: 22, h: 16 },
    "16:9": { w: 26, h: 14 },
    "9:16": { w: 14, h: 26 },
    "3:4": { w: 16, h: 22 },
    "21:9": { w: 28, h: 12 },
    imax: { w: 22, h: 15 },
  };
  const d = dims[id] ?? { w: 18, h: 18 };
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-[2px] border-2 border-current opacity-90"
      style={{ width: d.w, height: d.h }}
    />
  );
}

export function EditorOptionsPanel({
  mediaType,
  loading,
  inputDataUrl,
  aspectRatio,
  setAspectRatio,
  imageQuality,
  setImageQuality,
  strength,
  setStrength,
  canAddRefImages,
  refImages,
  setRefImages,
  userPlan,
  videoDuration,
  setVideoDuration,
  videoAspect,
  setVideoAspect,
  videoResolution,
  setVideoResolution,
  cost,
  isAdmin,
  credits,
  keepWatermark,
  setKeepWatermark,
  isFree,
  studioTier = "standard",
}: EditorOptionsPanelProps) {
  const [costOpen, setCostOpen] = useState(false);
  const expLabel = studioExperienceLabel(studioTier);
  const qualityLabel =
    IMAGE_QUALITY_OPTIONS.find((q) => q.id === imageQuality)?.label ?? imageQuality.toUpperCase();

  return (
    <section className="space-y-4">
      {mediaType === "image" ? null : (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          4. Options
        </p>
      )}

      {!loading && mediaType === "image" && !inputDataUrl && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Aspect ratio</p>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.filter((a) =>
              aspectRatiosForStudioTier(studioTier).includes(a.id as never),
            ).map((a) => {
              const active = aspectRatio === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectRatio(a.id)}
                  className={`flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    active
                      ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  aria-pressed={active}
                  aria-label={`Aspect ${a.label}`}
                >
                  <AspectShape id={a.id} />
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mediaType === "image" && inputDataUrl && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Aspect ratio</p>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.filter((a) =>
              aspectRatiosForStudioTier(studioTier).includes(a.id as never),
            ).map((a) => {
              const active = aspectRatio === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectRatio(a.id)}
                  className={`flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                    active
                      ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  aria-pressed={active}
                  aria-label={`Aspect ${a.label}`}
                >
                  <AspectShape id={a.id} />
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mediaType === "image" && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Quality</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_QUALITY_OPTIONS.filter((q) =>
              imageQualitiesForStudioTier(studioTier).includes(q.id),
            ).map((q) => {
              const active = imageQuality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setImageQuality(q.id)}
                  disabled={loading}
                  className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mediaType === "image" && inputDataUrl && (
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">Strength</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]/80" aria-hidden />
            Recommended
          </span>
        </div>
      )}

      {/* Multi-reference selection is handled by the gallery + slot only — no separate lock tile. */}

      {mediaType === "video" && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</span>
              <span
                title={MODEL_TIER_DESCRIPTION[modelTierForDuration(videoDuration)]}
                className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
              >
                {MODEL_TIER_LABEL[modelTierForDuration(videoDuration)]}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {VIDEO_DURATIONS.map((d) => {
                const allowed = isDurationAllowed(userPlan, d, isAdmin);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={loading}
                    title={allowed ? `${videoCreditCost(d)} credits` : `Upgrade to ${planRequiredForDuration(d)} to unlock ${d}s videos`}
                    onClick={() => {
                      if (!allowed) {
                        toast.error(`Upgrade to ${planRequiredForDuration(d)} to unlock ${d}s videos`);
                        return;
                      }
                      setVideoDuration(d);
                    }}
                    className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      videoDuration === d
                        ? "bg-primary text-primary-foreground"
                        : allowed
                          ? "bg-secondary text-foreground hover:bg-secondary/70"
                          : "bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    {allowed ? "" : "🔒"}{d}s
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aspect ratio</span>
            <div className="flex flex-wrap gap-2">
              {VIDEO_ASPECT_RATIOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={loading}
                  onClick={() => setVideoAspect(a)}
                  className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    videoAspect === a
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resolution</span>
            <div className="flex flex-wrap gap-2">
              {VIDEO_RESOLUTION_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setVideoResolution(r.id)}
                  className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    videoResolution === r.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mediaType === "image" && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Popover open={costOpen} onOpenChange={setCostOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  aria-label="Generation cost info"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>Info</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-2 text-xs" align="start">
                <p className="font-semibold">Cost estimate</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="font-medium">{expLabel}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="font-medium">{qualityLabel}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between gap-3">
                    <span className="font-medium">Estimated cost</span>
                    <span className="font-semibold tabular-nums">{cost} credits</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cost is deducted only on successful generation.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {mediaType === "video" && (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">Watermark</span>
        {isFree ? (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Locked · On
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={keepWatermark}
            onClick={() =>
              setKeepWatermark((v) => {
                const next = !v;
                try { localStorage.setItem("motio2edit-watermark-pref", next ? "on" : "off"); } catch { /* ignore */ }
                return next;
              })
            }
            disabled={loading}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              keepWatermark ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                keepWatermark ? "translate-x-5" : ""
              }`}
            />
            <span className="sr-only">{keepWatermark ? "Watermark on" : "Watermark off"}</span>
          </button>
        )}
      </div>
      )}
    </section>
  );
}
