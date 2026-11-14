/**
 * Public AI Photo Restoration Gallery — approved demonstration assets only.
 * Never publishes user uploads, private history, or storage URLs.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { pageHead, SITE_NAME } from "@/lib/seo";

import sampleRestoreBefore from "@/assets/sample-restore-before.jpg";
import sampleRestoreAfter from "@/assets/sample-restore-after.jpg";
import sampleUpscaleBefore from "@/assets/sample-upscale-before.jpg";
import sampleUpscaleAfter from "@/assets/sample-upscale-after.jpg";
import sampleObjectBefore from "@/assets/sample-object-before.jpg";
import sampleObjectAfter from "@/assets/sample-object-after.jpg";
import sampleRemovalBefore from "@/assets/sample-removal-before.jpg";
import sampleRemovalAfter from "@/assets/sample-removal-after.jpg";

export const Route = createFileRoute("/restored-images")({
  head: () =>
    pageHead({
      title: `AI Photo Restoration Gallery — ${SITE_NAME}`,
      description:
        "Before-and-after photo restoration examples powered by Motio2edit Maluto AI. Approved demonstration images only.",
      path: "/restored-images",
    }),
  component: RestoredImagesPage,
});

type DemoPair = {
  id: string;
  title: string;
  caption: string;
  before: string;
  after: string;
};

/** Approved public demonstration assets only — never user history. */
const DEMOS: DemoPair[] = [
  {
    id: "restore",
    title: "Photo restoration",
    caption: "Repair scratches, fade, and age while keeping identity intact.",
    before: sampleRestoreBefore,
    after: sampleRestoreAfter,
  },
  {
    id: "upscale",
    title: "Clarity upscale",
    caption: "Sharper detail for print and social without inventing a new face.",
    before: sampleUpscaleBefore,
    after: sampleUpscaleAfter,
  },
  {
    id: "object",
    title: "Clean background",
    caption: "Remove distractions and rebuild the scene naturally.",
    before: sampleObjectBefore,
    after: sampleObjectAfter,
  },
  {
    id: "removal",
    title: "Selective removal",
    caption: "Circle and erase unwanted subjects with seamless fill.",
    before: sampleRemovalBefore,
    after: sampleRemovalAfter,
  },
];

function PairCard({ pair }: { pair: DemoPair }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-2 gap-px bg-border">
        <figure className="relative bg-secondary">
          <img
            src={pair.before}
            alt={`${pair.title} before`}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-contain object-center"
          />
          <figcaption className="absolute left-2 top-2 rounded bg-background/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
            Before
          </figcaption>
        </figure>
        <figure className="relative bg-secondary">
          <img
            src={pair.after}
            alt={`${pair.title} after`}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-contain object-center"
          />
          <figcaption className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            After
          </figcaption>
        </figure>
      </div>
      <div className="p-4">
        <h2 className="text-base font-bold">{pair.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{pair.caption}</p>
      </div>
    </article>
  );
}

function RestoredImagesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
            <Sparkles className="h-3.5 w-3.5" /> Demonstration gallery
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-4xl">
            AI Photo Restoration Gallery
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Approved before-and-after examples from Motio2edit. Private user uploads are never
            published here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-violet-600 text-white">
              <Link to="/studio/image/auto-edit">
                Restore Your Photo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back home</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {DEMOS.map((pair) => (
            <PairCard key={pair.id} pair={pair} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Gallery content is curated demonstration media only. User generation history remains
          private.
        </p>
      </main>
      <Footer />
    </div>
  );
}
