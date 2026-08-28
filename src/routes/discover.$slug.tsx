import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  getDiscoverItem,
  inputRequirementLabel,
  discoverTargetPath,
} from "@/lib/discover/catalog";
import { applyDiscoverPreset } from "@/components/discover/DiscoveryDetailSheet";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/discover/$slug")({
  head: ({ params }) => {
    const item = getDiscoverItem(params.slug);
    const title = item
      ? `${item.title} — Motio2Edit`
      : "Idea not found — Motio2Edit";
    const description =
      item?.description ?? "Browse creative recipes on Motio2Edit.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: DiscoverDetailPage,
});

function DiscoverDetailPage() {
  const { slug } = Route.useParams();
  const item = getDiscoverItem(slug);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSignedIn = !!user;

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Idea not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This recipe may have been removed or the link is incorrect.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const handleUse = () => {
    if (!item.available) {
      toast.message("This experience is not available yet");
      return;
    }
    if (!isSignedIn) {
      void navigate({
        to: "/auth",
        search: { redirect: discoverTargetPath(item) },
      });
      return;
    }
    const path = applyDiscoverPreset(item);
    toast.success("Recipe loaded", { description: item.title, duration: 2000 });
    window.setTimeout(() => {
      void navigate({ to: path as never });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:pb-16 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Discover
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative aspect-[16/10] bg-secondary sm:aspect-[16/9]">
            <img
              src={item.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
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

          <div className="p-5 sm:p-6">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {item.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>

            <div className="mt-5 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Input required
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {inputRequirementLabel(item.inputRequirement)}
              </p>
            </div>

            {item.prompt ? (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Prompt
                </p>
                <p className="mt-1.5 rounded-xl border border-border bg-background p-3 text-sm leading-relaxed">
                  {item.prompt}
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                No prompt needed — upload a photo and Auto Edit handles the rest.
              </p>
            )}

            <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
              {item.aspectRatio && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">Aspect</dt>
                  <dd className="font-semibold">{item.aspectRatio}</dd>
                </div>
              )}
              {item.quality && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">Quality</dt>
                  <dd className="font-semibold">{item.quality.toUpperCase()}</dd>
                </div>
              )}
              {item.durationSec != null && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">Duration</dt>
                  <dd className="font-semibold">{item.durationSec}s</dd>
                </div>
              )}
              {item.sound != null && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">Sound</dt>
                  <dd className="font-semibold">{item.sound ? "On" : "Off"}</dd>
                </div>
              )}
              {item.estimatedCredits != null && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">Est. credits</dt>
                  <dd className="font-semibold">~{item.estimatedCredits}</dd>
                </div>
              )}
              {item.styleLabel && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">Style</dt>
                  <dd className="font-semibold">{item.styleLabel}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button
            type="button"
            size="lg"
            className="w-full gap-2 font-bold sm:max-w-sm"
            disabled={!item.available}
            onClick={handleUse}
          >
            {item.available ? (
              <>
                Use this
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Coming soon"
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-left">
            Opens the matching studio with this recipe preloaded.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
