/**
 * Partner Offers — Get Gifts & Rewards.
 * Multitag and Direct Link are EXTERNAL buttons only (new tab).
 * No embedded multitag scripts on this page.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Gift, ArrowLeft, Sparkles, Shield } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { MONETAG_MULTITAG_URL, DIRECT_LINK_URL } from "@/config/ads";
import { Button } from "@/components/ui/button";
import { AdsterraBanner } from "@/components/ads";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Get Gifts & Rewards — Motio2edit" },
      {
        name: "description",
        content:
          "Explore optional partner offers. Third-party advertising — you leave Motio2edit when opening an external offer.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
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

      <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl border border-orange-500/20 bg-card shadow-lg shadow-orange-500/5">
          <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-violet-600 px-6 py-8 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <Gift className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Partner offers</p>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Get Gifts & Rewards
                </h1>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/90">
              Explore partner offers and discover opportunities to earn rewards.
            </p>
          </div>

          <div className="space-y-4 p-6">
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              These are third-party advertising offers. You will leave Motio2edit when opening an
              external offer. Participation is optional. Motio2edit does not add credits from a
              client click alone.
            </p>

            <div className="space-y-3">
              <a
                href={MONETAG_MULTITAG_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-95"
              >
                <Gift className="h-4 w-4" />
                Open Multitag offers
                <ExternalLink className="h-4 w-4" />
              </a>
              <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Sponsored · External link
              </p>

              <a
                href={DIRECT_LINK_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-primary/10 px-4 py-3.5 text-sm font-bold text-primary transition hover:bg-primary/15"
              >
                <Sparkles className="h-4 w-4" />
                Open Direct Link offer
                <ExternalLink className="h-4 w-4" />
              </a>
              <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Sponsored · External link
              </p>
            </div>

            <div className="relative pt-2">
              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Ad
              </p>
              <AdsterraBanner unit="rect300x250" placement="offers-mid" />
            </div>

            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Multitag is not embedded on this page — it opens only when you press the button.
              </li>
              <li className="flex gap-2">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                External destinations open in a new browser tab.
              </li>
            </ul>

            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/">Return to Motio2edit</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
