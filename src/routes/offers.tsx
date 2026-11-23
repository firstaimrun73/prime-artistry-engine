/**
 * Gift / partner offers page.
 * Soft framing: stay here, claim gift by clicking ads.
 * Both multitag and direct-link CTAs (ad-blocker resilient).
 * Multitag opens only after explicit click (new tab). noindex.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Gift, ArrowLeft, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import {
  MONETAG_MULTITAG_URL,
  DIRECT_LINK_URL,
  detectAdBlocker,
  SPONSOR_DISPLAY_NAME,
} from "@/config/ads";
import { Button } from "@/components/ui/button";
import { AdsterraBanner } from "@/components/ads";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Gift offers — Motio2edit" },
      {
        name: "description",
        content: "Gift offers for Motio2edit creators. Stay on this page and explore sponsored partner gifts.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setBlocked(detectAdBlocker());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandMark size="md" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Gift className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">You have a gift waiting</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Stay on this page and open a sponsored gift below. Pick any offer that looks useful —
                no automatic redirects.
              </p>
            </div>
          </div>

          {blocked && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Ad blocker detected — use the gift buttons below (they still work).
            </p>
          )}

          <div className="mt-6 space-y-3">
            <a
              href={MONETAG_MULTITAG_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-95"
            >
              <Gift className="h-4 w-4" />
              Claim gift offer
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href={DIRECT_LINK_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
              Explore partner gift
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Sponsored · {SPONSOR_DISPLAY_NAME} · opens in a new tab when you click
          </p>

          <AdsterraBanner unit="rect300x250" placement="offers-mid" className="mt-6" />

          <Button asChild variant="outline" className="mt-4 w-full rounded-full">
            <Link to="/">Back to Motio2edit</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
