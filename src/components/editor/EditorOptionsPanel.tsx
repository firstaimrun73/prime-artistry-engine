import { Lock, Coins, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  IMAGE_QUALITY_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
  type ImageQuality,
  type VideoResolution,
} from "@/lib/quality-options";
import { Slider } from "@/components/ui/slider";
import { MultiImageInput } from "@/components/MultiImageInput";
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

function AspectShape({ id }: { id: string }) {
  const dims: Record<string, { w: number; h: number }> = {
    "1:1": { w: 16, h: 16 },
    "4:3": { w: 18, h: 14 },
    "16:9": { w: 20, h: 11 },
    "9:16": { w: 11, h: 18 },
    "3:4": { w: 14, h: 18 },
  };
  const d = dims[id] ?? { w: 16, h: 16 };
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
      {mediaType === "image" ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Format & quality
        </p>
      ) : (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          4. Options
        </p>
      )}

      {!loading && mediaType === "image" && !inputDataUrl && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Aspect ratio</p>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.filter((a) =>
              aspectRatiosForStudioTier(studioTier).includes(a.id),
            ).map((a) => {
              const active = aspectRatio === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectRatio(a.id)}
                  className={`flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-medium transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <AspectShape id={a.id} />
                  <span className="tabular-nums">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!loading && mediaType === "image" && (() => {
        const allowed = imageQualitiesForStudioTier(studioTier);
        const visible = IMAGE_QUALITY_OPTIONS.filter((q) => allowed.includes(q.id));
        return (
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Quality</p>
            <div className="flex flex-wrap gap-2">
              {visible.map((q) => {
                const active = imageQuality === q.id;
                const is4k = q.id === "4k";
                const is8k = q.id === "8k";
                const ultraAura = studioTier === "premium" && (is4k || is8k);
                return (
                  <button
                    key={q.id}
                    type="button"
                    title={q.hint}
                    onClick={() => setImageQuality(q.id)}
                    className={`min-h-[40px] rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                      ultraAura && active && is8k
                        ? "border-[#D4AF37]/80 bg-[#D4AF37]/15 text-[#E8C547] shadow-[0_0_14px_-2px_rgba(212,175,55,0.55)]"
                        : ultraAura && active && is4k
                          ? "border-[#D4AF37]/55 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_10px_-3px_rgba(212,175,55,0.35)]"
                          : ultraAura && !active
                            ? "border-[#D4AF37]/25 bg-card text-muted-foreground hover:border-[#D4AF37]/50 hover:text-[#E8C547]"
                            : active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
            {(() => {
              const opt = IMAGE_QUALITY_OPTIONS.find((q) => q.id === imageQuality);
              if (!opt) return null;
              return (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/80">{opt.label}</span>
                  {" — "}
                  {opt.title ?? opt.label}
                  <span className="mt-0.5 block opacity-90">{opt.hint}</span>
                </p>
              );
            })()}
          </div>
        );
      })()}

      {mediaType === "image" && inputDataUrl && studioTier !== "standard" && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Edit strength</span>
            <span>{Math.round(strength * 100)}%</span>
          </div>
          <Slider
            value={[strength]}
            min={0.1}
            max={1}
            step={0.05}
            onValueChange={(v) => setStrength(v[0])}
            disabled={loading}
          />
          <p className="text-[11px] text-muted-foreground">
            Higher = more visible changes. Lower preserves the original more.
          </p>
        </div>
      )}

      {mediaType === "image" && canAddRefImages && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Reference images
            {studioTier === "premium"
              ? " · multi-image intelligence"
              : studioTier === "standard"
                ? " · up to plan limit (Standard uses 2–5)"
                : " (optional)"}
          </p>
          <MultiImageInput
            userPlan={userPlan}
            images={refImages}
            onChange={setRefImages}
            disabled={loading}
          />
        </div>
      )}

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
              {VIDEO_ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setVideoAspect(r.id)}
                  className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    videoAspect === r.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {r.icon} {r.id} {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Output resolution
            </span>
            <div className="flex flex-wrap gap-2">
              {VIDEO_RESOLUTION_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  title={r.hint}
                  disabled={loading}
                  onClick={() => setVideoResolution(r.id)}
                  className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    videoResolution === r.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {r.label} · {Math.round(videoCreditCost(videoDuration) * r.multiplier)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <Coins className="h-3.5 w-3.5 text-primary" /> Estimated cost: {cost} credits
            </div>
            <div className="text-muted-foreground">
              Your balance: {isAdmin ? "∞" : credits} credits
            </div>
          </div>
        </div>
      )}

      {mediaType === "image" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Generation cost</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {cost} credits
            </span>
            <Popover open={costOpen} onOpenChange={setCostOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Cost breakdown"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Generation cost
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Experience</span>
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
                  Balance: {isAdmin ? "∞" : credits} · After: {isAdmin ? "∞" : Math.max(0, credits - cost)}
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

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
    </section>
  );
}
