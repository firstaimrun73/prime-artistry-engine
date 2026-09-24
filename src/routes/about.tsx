/**
 * About Product — single canonical editorial page (/about)
 * Sections: Image Studio → Video → Music → Maluto AI → Circle 2edit → Filters → Lenses
 */
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEMANTIC_TAG_REGISTRY, MAX_SEMANTIC_TAGS } from "@/lib/studio/image/tag-semantic-registry";
import { IMAGE_EXPERIENCE_BASE_CREDITS, ULTRA_8K_EXTRA_CREDITS } from "@/lib/studio/image/image-experience-credits";
import { STANDARD_CREDITS } from "@/lib/studio/image/standard/credits";
import { PREMIUM_T2I_CREDITS } from "@/lib/studio/image/premium/credits";
import { ULTRA_T2I_CREDITS } from "@/lib/studio/image/ultra/credits";
import { AUTO_EDIT_CREDITS_BY_QUALITY, AUTO_EDIT_PRODUCT_NAME } from "@/lib/auto-edit/constants";
import { ALL_FILTERS } from "@/lib/filter-lens/filters/filter-registry";
import { ALL_LENSES } from "@/lib/filter-lens/lenses/lens-registry";
import { imageQualityDimensions } from "@/lib/quality-options";
import { cn } from "@/lib/utils";
import { Circle2editGuideSection } from "@/components/about/Circle2editGuideSection";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Product — Motio2edit" },
      {
        name: "description",
        content:
          "Motio2edit About Product: Image Studio, Video Studio, Music Studio, Maluto AI, Circle 2edit, Filters, and Lenses — how generation, tags, quality, credits, and editing tools work.",
      },
      { property: "og:title", content: "About Product — Motio2edit" },
    ],
  }),
  component: AboutProductPage,
});

const CIRCLE = "#7B6FE0";
const IMAGE_ACCENT = "oklch(0.70 0.19 45)";
const VIDEO_ACCENT = "oklch(0.55 0.22 25)";
const MUSIC_ACCENT = "oklch(0.58 0.22 310)";
const MALUTO_ACCENT = "oklch(0.55 0.12 250)";

const SECTIONS = [
  { id: "image-studio", label: "Image Studio" },
  { id: "video-studio", label: "Video Studio" },
  { id: "music-studio", label: "Music Studio" },
  { id: "maluto-ai", label: "Maluto AI" },
  { id: "circle-2edit", label: "Circle 2edit" },
  { id: "filters", label: "Filters" },
  { id: "lenses", label: "Lenses" },
] as const;

function Divider() {
  return <hr className="my-12 border-0 border-t border-neutral-200 sm:my-14" />;
}

function StepDiagram({ steps, accent = CIRCLE }: { steps: string[]; accent?: string }) {
  return (
    <ol className="mt-5 flex flex-wrap gap-2 sm:gap-3" aria-label="Process steps">
      {steps.map((label, i) => (
        <li key={label + i} className="flex items-center gap-2">
          <span
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {i + 1}
          </span>
          <span className="text-sm text-neutral-800">{label}</span>
          {i < steps.length - 1 && (
            <span className="mx-1 hidden text-neutral-300 sm:inline" aria-hidden>
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Table({
  headers,
  rows,
  accent,
}: {
  headers: string[];
  rows: (string | number)[][];
  accent?: string;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-neutral-50" style={accent ? { backgroundColor: `${accent}22` } : undefined}>
            {headers.map((h) => (
              <th key={h} className="border-b border-neutral-200 px-3 py-2 font-semibold text-neutral-900">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-neutral-50/60">
              {r.map((c, j) => (
                <td key={j} className="border-b border-neutral-100 px-3 py-2 text-neutral-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AboutProductPage() {
  const [navOpen, setNavOpen] = useState(false);
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    const id = (hash || "").replace(/^#/, "");
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [hash]);

  const scrollTo = (id: string) => {
    setNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      try {
        history.replaceState(null, "", `#${id}`);
      } catch {
        /* ignore */
      }
    }
  };

  const tagCount = SEMANTIC_TAG_REGISTRY.length;
  const filterCount = ALL_FILTERS.length;
  const lensCount = ALL_LENSES.length;

  const tagsByCategory = useMemo(() => {
    const m = new Map<string, (typeof SEMANTIC_TAG_REGISTRY)[number][]>();
    for (const t of SEMANTIC_TAG_REGISTRY) {
      const list = m.get(t.category) ?? [];
      list.push(t);
      m.set(t.category, list);
    }
    return m;
  }, []);

  const qualityRows = (["sd", "hd", "2k", "4k", "8k"] as const).map((q) => {
    const d11 = imageQualityDimensions(q, "1:1");
    const d169 = imageQualityDimensions(q, "16:9");
    return [
      q.toUpperCase(),
      `${d11.w}×${d11.h} (1:1)`,
      `${d169.w}×${d169.h} (16:9)`,
      q === "sd"
        ? "Previews, drafts"
        : q === "hd"
          ? "Web, social"
          : q === "2k"
            ? "Detail work"
            : q === "4k"
              ? "Print / large display"
              : "Ultra AI path where plan allows",
    ];
  });

  const aspectRows = [
    ["1:1", "Square", "Instagram posts, profile", "e.g. 1024×1024 HD"],
    ["4:5", "Portrait social", "Instagram feed portrait", "Depends on quality long side"],
    ["3:4", "Portrait photo", "Classic portrait stills", "Depends on quality"],
    ["4:3", "Landscape photo", "Standard photography", "Depends on quality"],
    ["3:2", "Photo landscape", "DSLR-style stills", "Depends on quality"],
    ["2:3", "Portrait tall", "Poster / print portrait", "Depends on quality"],
    ["16:9", "Widescreen", "YouTube, landscape thumbs", "Depends on quality"],
    ["9:16", "Vertical", "Stories, Reels, TikTok", "Depends on quality"],
    ["IMAX (≈1.43:1)", "Cinematic", "Framing concept — not one fixed pixel size", "Long side × (1/1.43)"],
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link
            to="/dashboard"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Motio2edit</p>
            <p className="truncate text-sm font-medium text-neutral-900">About Product</p>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
            aria-expanded={navOpen}
            aria-controls="about-section-nav"
          >
            Sections
            <ChevronDown className={cn("h-3.5 w-3.5 transition", navOpen && "rotate-180")} />
          </button>
        </div>
        {navOpen && (
          <div id="about-section-nav" className="border-t border-neutral-100 bg-white px-4 py-3 sm:px-6">
            <nav className="mx-auto flex max-w-3xl flex-wrap gap-2" aria-label="About Product sections">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <section aria-labelledby="about-hero">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: IMAGE_ACCENT }}>
            Motio2edit
          </p>
          <h1 id="about-hero" className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            One place to create, edit, and reimagine images, video, and music with AI.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-700 sm:text-lg">
            This page documents how Motio2edit works today across Image Studio, Video Studio, Music Studio,
            Maluto AI, Circle 2edit, Filters, and Lenses — modes, quality, credits, and practical workflows.
          </p>
        </section>

        <Divider />

        <section id="image-studio" aria-labelledby="image-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: IMAGE_ACCENT }}>
            Generate · edit · refine
          </p>
          <h2 id="image-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Image Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Image Studio covers text-to-image and image-to-image generation, plus focused edit tools.
            Choose quality and aspect ratio, add semantic tags when helpful, and spend credits by path
            (Standard, Premium, Ultra, Auto Edit).
          </p>
          <StepDiagram
            accent={IMAGE_ACCENT}
            steps={["Prompt or upload", "Quality & tags", "Generate", "Refine", "Download"]}
          />
          <Table
            accent={IMAGE_ACCENT}
            headers={["Path", "Typical credits"]}
            rows={[
              ["Standard (T2I SD/HD)", `${STANDARD_CREDITS.textToImageSd} / ${STANDARD_CREDITS.textToImageHd}`],
              ["Premium (T2I SD/HD/2K)", `${PREMIUM_T2I_CREDITS.sd} / ${PREMIUM_T2I_CREDITS.hd} / ${PREMIUM_T2I_CREDITS["2k"]}`],
              ["Ultra (T2I SD/HD/2K/4K)", `${ULTRA_T2I_CREDITS.sd} / ${ULTRA_T2I_CREDITS.hd} / ${ULTRA_T2I_CREDITS["2k"]} / ${ULTRA_T2I_CREDITS["4k"]}`],
              [AUTO_EDIT_PRODUCT_NAME, Object.values(AUTO_EDIT_CREDITS_BY_QUALITY).map(String).join(" / ")],
            ]}
          />
          <h3 className="mt-10 text-base font-semibold text-neutral-900">Quality & dimensions</h3>
          <Table headers={["Quality", "1:1 example", "16:9 example", "Best for"]} rows={qualityRows} />
          <h3 className="mt-10 text-base font-semibold text-neutral-900">Aspect ratios</h3>
          <Table headers={["Ratio", "Shape", "Use", "Notes"]} rows={aspectRows} />
          <p className="mt-4 text-sm text-neutral-600">
            Semantic tags: up to {MAX_SEMANTIC_TAGS} from a registry of {tagCount} tags across categories
            ({Array.from(tagsByCategory.keys()).join(", ")}).
          </p>
        </section>

        <Divider />

        <section id="video-studio" aria-labelledby="video-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VIDEO_ACCENT }}>
            Motion · scene · clip
          </p>
          <h2 id="video-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Video Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Video Studio turns a written idea or a still photo into a short AI-generated video clip. Text-to-Video describes a scene; Image-to-Video animates a still; Video-to-Video restyles a clip while keeping motion. Choose duration, aspect (9:16, 1:1, 4:5, or 16:9), quality, and optional sound, then preview before download.
          </p>
          <StepDiagram
            accent={VIDEO_ACCENT}
            steps={["Text or still", "Duration & aspect", "Generate", "Preview", "Download"]}
          />
        </section>

        <Divider />

        <section id="music-studio" aria-labelledby="music-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUSIC_ACCENT }}>
            Score · mood · track
          </p>
          <h2 id="music-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Music Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Music Studio generates original tracks from text prompts. Pick genre and mood chips, generate a
            bed or full track, then download for use in video or standalone listening. Credit costs and
            length options follow the active plan.
          </p>
          <StepDiagram
            accent={MUSIC_ACCENT}
            steps={["Prompt & mood", "Generate", "Listen", "Download"]}
          />
        </section>

        <Divider />

        <section id="maluto-ai" aria-labelledby="maluto-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MALUTO_ACCENT }}>
            Guide · suggest · orient
          </p>
          <h2 id="maluto-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Maluto AI
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Maluto AI is Motio2edit&apos;s in-product assistant for creative guidance — helping refine ideas,
            suggest edit directions, and orient you inside the studios. Generation credits for Image, Video,
            and Music still apply when you run those tools; Maluto itself is guidance, not a separate
            generation meter on this page.
          </p>
        </section>

        <Divider />

        <Circle2editGuideSection />

        <Divider />

        <section id="filters" aria-labelledby="filters-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FF5A1F]">
            Looks · grades · styles
          </p>
          <h2 id="filters-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Filters
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Motio2edit Filters is a collection of <strong>{filterCount}</strong> curated visual styles for
            portraits, travel, fashion, street photography, social content, vintage looks, cinematic images,
            creative color treatments, and polished professional edits. Upload a photo, preview live, adjust
            intensity, and apply on-device.
          </p>
          <h3 className="mt-8 text-base font-semibold text-neutral-900">Common</h3>
          <p className="mt-2 text-base leading-relaxed text-neutral-700">
            Common filters are the everyday collection. They are designed for quick, natural, attractive edits
            that work well across portraits, travel photos, social posts, food, lifestyle, and everyday
            photography. Free plans can use the full Common set.
          </p>
          <h3 className="mt-6 text-base font-semibold text-neutral-900">AI+</h3>
          <p className="mt-2 text-base leading-relaxed text-neutral-700">
            AI+ filters are more expressive and refined. They are designed for stronger cinematic color,
            creative atmosphere, portrait-focused styling, advanced color separation, and more distinctive
            visual character — still running as on-device look grades with live preview.
          </p>
          <h3 className="mt-6 text-base font-semibold text-neutral-900">Premium</h3>
          <p className="mt-2 text-base leading-relaxed text-neutral-700">
            Premium filters are the highest-level visual collection. They focus on sophisticated cinematic
            grades, large-format-inspired looks, dramatic color treatments, editorial styles, ultra-detailed
            aesthetics, and polished professional finishes.
          </p>
        </section>

        <Divider />

        <section id="lenses" aria-labelledby="lenses-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D6A4F]">
            Specialty · paths · effects
          </p>
          <h2 id="lenses-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Lenses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Lenses are specialty edit paths. Motio2edit ships <strong>{lensCount}</strong> lenses from the product
            registry.
          </p>
        </section>

        <Divider />

        <section className="pb-8">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-8 text-center">
            <p className="text-base font-medium text-neutral-900">Ready to edit?</p>
            <div className="mt-4">
              <Button asChild size="lg" className="min-h-11 px-8 text-base">
                <Link to="/">Try Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
