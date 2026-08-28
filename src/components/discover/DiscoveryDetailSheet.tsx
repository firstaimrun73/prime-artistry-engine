import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildPresetPayload,
  discoverTargetPath,
  inputRequirementLabel,
  DISCOVER_PRESET_KEY,
} from "@/lib/discover/catalog";
import type { DiscoverItem } from "@/lib/discover/types";
import { ArrowRight, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Props = {
  item: DiscoverItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSignedIn: boolean;
  onUse: (item: DiscoverItem) => void;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

export function DiscoveryDetailSheet({ item, open, onOpenChange, isSignedIn, onUse }: Props) {
  if (!item) return null;

  const sharePath = `/discover/${item.id}`;
  const target = discoverTargetPath(item);

  const handleShare = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${sharePath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:max-w-lg sm:left-1/2 sm:-translate-x-1/2",
        )}
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-secondary sm:aspect-[16/9]">
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/20 bg-background/80 px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
              {item.badge}
            </span>
            {item.isStaffPick && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/25 px-2 py-1 text-[10px] font-semibold text-amber-50 backdrop-blur">
                <Sparkles className="h-3 w-3" /> Staff pick
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="text-xl font-extrabold tracking-tight">{item.title}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {item.description}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Input required
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {inputRequirementLabel(item.inputRequirement)}
            </p>
          </div>

          {item.prompt ? (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prompt
              </p>
              <p className="mt-1.5 rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-foreground">
                {item.prompt}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-3 text-sm text-muted-foreground">
              No prompt needed — upload a photo and Auto Edit handles the rest.
            </div>
          )}

          <div className="mt-4 rounded-xl border border-border bg-card px-3">
            {item.aspectRatio && <MetaRow label="Aspect ratio" value={item.aspectRatio} />}
            {item.quality && <MetaRow label="Quality" value={item.quality.toUpperCase()} />}
            {item.styleLabel && <MetaRow label="Style" value={item.styleLabel} />}
            {item.durationSec != null && (
              <MetaRow label="Duration" value={`${item.durationSec}s`} />
            )}
            {item.sound != null && (
              <MetaRow label="Sound" value={item.sound ? "On" : "Off"} />
            )}
            {item.estimatedCredits != null && (
              <MetaRow
                label="Est. credits"
                value={`~${item.estimatedCredits} (server confirms at generate)`}
              />
            )}
            <MetaRow
              label="Opens"
              value={
                item.tool === "circle"
                  ? "Circle 2edit"
                  : item.tool === "auto-edit"
                    ? "Auto Edit"
                    : item.tool === "video"
                      ? "Video Studio"
                      : item.tool === "music"
                        ? "Music Studio"
                        : "Image Editor"
              }
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link to="/discover/$slug" params={{ slug: item.id }}>
                Open page
              </Link>
            </Button>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          {item.available ? (
            isSignedIn ? (
              <Button
                type="button"
                size="lg"
                className="w-full gap-2 font-bold"
                onClick={() => onUse(item)}
              >
                Use this
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" size="lg" className="w-full gap-2 font-bold" asChild>
                <Link to="/auth" search={{ redirect: target }}>
                  Sign in to use this
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )
          ) : (
            <Button type="button" size="lg" className="w-full" disabled>
              Coming soon
            </Button>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {isSignedIn
              ? `Opens ${target.replace(/^\//, "")} with this recipe`
              : "Create a free account to try this recipe"}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function applyDiscoverPreset(item: DiscoverItem): string {
  const payload = buildPresetPayload(item);
  try {
    sessionStorage.setItem(DISCOVER_PRESET_KEY, JSON.stringify(payload));
    if (item.tool === "video") {
      sessionStorage.setItem("motio2edit-mode", "video");
    } else if (item.tool === "image" || item.tool === "circle") {
      sessionStorage.setItem("motio2edit-mode", "image");
    }
  } catch {
    /* ignore */
  }
  return discoverTargetPath(item);
}
