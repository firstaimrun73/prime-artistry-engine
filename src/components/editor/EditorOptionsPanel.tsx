import { Lock, Coins } from "lucide-react";
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
}: EditorOptionsPanelProps) {
  return (
    <section className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        4. Options
      </p>

      {/* Aspect ratio chips — text-to-image only */}
      {!loading && mediaType === "image" && !inputDataUrl && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Aspect ratio</p>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.map((a) => {
              const active = aspectRatio === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspectRatio(a.id)}
                  className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Output quality — image only (HD / 2K / 4K) */}
      {!loading && mediaType === "image" && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Output quality</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_QUALITY_OPTIONS.map((q) => {
              const active = imageQuality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  title={q.hint}
                  onClick={() => setImageQuality(q.id)}
                  className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {q.label} · {q.credits}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {IMAGE_QUALITY_OPTIONS.find((q) => q.id === imageQuality)?.hint}
          </p>
        </div>
      )}

      {mediaType === "image" && inputDataUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Edit strength</span>
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

      {/* Plan-based reference images for richer multi-image edits. */}
      {canAddRefImages && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Reference images (optional)
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
            {videoDuration >= 15 && (
              <p className="mt-1.5 text-[11px] font-medium text-primary">
                {videoDuration}s videos take ~3–5 minutes. Please don't close this page.
              </p>
            )}
            {!isAdmin && !isDurationAllowed(userPlan, 30) && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Longer clips need a higher plan.{" "}
                <Link to="/pricing" className="font-medium text-primary hover:underline">View plans</Link>
              </p>
            )}
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
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {VIDEO_RESOLUTION_OPTIONS.find((r) => r.id === videoResolution)?.hint}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <Coins className="h-3.5 w-3.5 text-primary" /> Estimated cost: {cost} credits
            </div>
            <div className="text-muted-foreground">
              Your balance: {isAdmin ? "∞" : credits} credits
            </div>
            <div className="text-muted-foreground">
              After generation: {isAdmin ? "∞" : Math.max(0, credits - cost)} credits remaining
            </div>
          </div>
        </div>
      )}

      {/* Watermark control — free users are locked on; paid users choose. */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">Motio2edit watermark</span>
        {isFree ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> On (Free)
          </span>
        ) : (
          <button
            type="button"
            onClick={() =>
              setKeepWatermark((v) => {
                const next = !v;
                try { localStorage.setItem("motio2edit-watermark-pref", next ? "on" : "off"); } catch { /* ignore */ }
                return next;
              })
            }
            disabled={loading}
            className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              keepWatermark ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {keepWatermark ? "Watermark ON" : "No Watermark"}
          </button>
        )}
      </div>
    </section>
  );
}