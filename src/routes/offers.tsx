/**
 * Isolated advertising / rewards offers page.
 * Monetag multitag opens ONLY after explicit button click (new tab).
 * No scripts auto-load on page view. noindex for SEO isolation.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Gift, ArrowLeft, Shield } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { MONETAG_MULTITAG_URL } from "@/config/ads";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Partner offers — Motio2edit" },
      {
        name: "description",
        content: "Optional partner advertising offers. Separate from Motio2edit creative tools.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
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
            Back to Motio2edit
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
              <h1 className="text-xl font-bold tracking-tight">Partner offers</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You are leaving the Motio2edit creative workspace to view third-party advertising
                offers. This is optional and separate from your plan credits.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Offers open only when you press the button below — never automatically.
            </li>
            <li className="flex gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Partner sites may show ads. Motio2edit does not add credits from a client click alone.
            </li>
          </ul>

          <a
            href={MONETAG_MULTITAG_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-95"
          >
            Open partner offers
            <ExternalLink className="h-4 w-4" />
          </a>

          <Button asChild variant="outline" className="mt-3 w-full rounded-full">
            <Link to="/">Return to Motio2edit</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
