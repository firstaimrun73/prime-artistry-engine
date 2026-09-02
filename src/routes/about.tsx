/**
 * About Product — single canonical editorial page (/about)
 * Sections: Image Studio → Video → Music → Maluto AI → Circle 2edit → Filters → Lenses
 * Data-driven tags/filters/lenses from existing registries. Credit tables from authoritative modules.
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
import { CIRCLE_REMOVE_CREDITS, CIRCLE_ADD_BASE_BY_MP } from "@/lib/circle-edit/credits";
import { ALL_FILTERS } from "@/lib/filter-lens/filters/filter-registry";
import { ALL_LENSES } from "@/lib/filter-lens/lenses/lens-registry";
import { imageQualityDimensions } from "@/lib/quality-options";
import { cn } from "@/lib/utils";

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

  const filterNames = useMemo(() => ALL_FILTERS.map((f) => f.name), []);
  const lensNames = useMemo(() => ALL_LENSES.map((l) => `${l.name} (${l.specialty})`), []);

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
            About Product
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
            This page documents how Motio2edit works today: Image Studio modes and tags, credits and quality,
            Maluto AI, Circle 2edit, Filters, and Lenses. Video Studio and Music Studio headings are reserved
            while those product specs are finalized.
          </p>
        </section>

        <Divider />

        <section id="image-studio" aria-labelledby="image-studio-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: IMAGE_ACCENT }}>
            Studio
          </p>
          <h2 id="image-studio-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Image Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Image Studio is the main editor for beginners, intermediate users, experienced editors, creators,
            photographers, designers, and advanced users. You can generate from text, edit a single photo, or
            guide an edit with one or more reference images — according to what the selected experience supports.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Workflows</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>
              <strong className="text-neutral-900">Text-to-image</strong> — no source photo; generate from a prompt.
            </li>
            <li>
              <strong className="text-neutral-900">Image-to-image</strong> — one base photo plus a prompt.
            </li>
            <li>
              <strong className="text-neutral-900">Image-reference editing</strong> — base photo plus optional
              references for specific attributes (via tags).
            </li>
            <li>
              <strong className="text-neutral-900">Multiple-reference editing</strong> — where the active experience
              accepts multiple images (Standard up to 5 total; Premium/Ultra multi paths as implemented).
            </li>
          </ul>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Basic flow</h3>
          <StepDiagram
            accent={IMAGE_ACCENT}
            steps={[
              "User prompt",
              "Optional image(s)",
              "Optional tags",
              "Generate / edit",
              "Quality · aspect",
              "Result",
              "Download / history",
            ]}
          />

          <h3 className="mt-10 text-base font-semibold text-neutral-900">Standard · Premium · Ultra AI</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            Internal experience ids are <code className="rounded bg-neutral-100 px-1">standard</code>,{" "}
            <code className="rounded bg-neutral-100 px-1">pro</code> (user-facing <strong>Premium</strong>), and{" "}
            <code className="rounded bg-neutral-100 px-1">premium</code> (user-facing <strong>Ultra AI</strong>).
            Plan gates are enforced server-side: Free/Lite/Plus → Standard; Pro plan → Standard + Premium;
            Studio/Business → all three.
          </p>
          <Table
            accent={IMAGE_ACCENT}
            headers={["Factor", "Standard", "Premium", "Ultra AI"]}
            rows={[
              ["Intended use", "Everyday create & edit", "Stronger edits / refs", "Highest supported tier"],
              ["Text-to-image", "Yes", "Yes", "Yes"],
              ["Single image edit", "Yes", "Yes", "Yes"],
              ["Multi-reference", "Supported (≤5 images)", "Higher multi limits where enabled", "2–10 where enabled"],
              ["Quality chips", "SD / HD", "SD / HD / 2K", "SD → 8K (8K plan-gated)"],
              ["Detail & sharpness", "Solid defaults", "Higher fidelity paths", "Advanced enhancement / delivery"],
              ["Prompt complexity", "Natural language", "Stronger instruction following", "Most capable controls exposed"],
            ]}
          />
          <p className="mt-3 text-xs text-neutral-500">
            Capabilities describe product behavior — not private model marketing names. Exact model routing is
            server-side.
          </p>

          <h3 className="mt-10 text-base font-semibold text-neutral-900">Credits (Image Studio)</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            Credits are the internal usage unit for AI generation and edits. They exist because inference, storage,
            and delivery consume real compute. Under the approved Image Studio surface rules,{" "}
            <strong className="text-neutral-900">quality chips do not automatically add credits</strong> except the
            approved Ultra AI 8K surcharge (+{ULTRA_8K_EXTRA_CREDITS}) on Studio/Business plans. Aspect ratio does not
            add a separate charge on the surface calculator.
          </p>
          <p className="mt-2 text-sm text-neutral-700">
            Authoritative surface table (experience × mode) used by UI and server (
            <code className="rounded bg-neutral-100 px-1 text-[11px]">computeImageExperienceCredits</code>):
          </p>
          <Table
            accent={IMAGE_ACCENT}
            headers={["Mode", "Standard", "Premium", "Ultra AI"]}
            rows={[
              [
                "Text → Image",
                String(IMAGE_EXPERIENCE_BASE_CREDITS.standard.text_to_image),
                String(IMAGE_EXPERIENCE_BASE_CREDITS.pro.text_to_image),
                String(IMAGE_EXPERIENCE_BASE_CREDITS.premium.text_to_image),
              ],
              [
                "Image → Image",
                String(IMAGE_EXPERIENCE_BASE_CREDITS.standard.image_to_image),
                String(IMAGE_EXPERIENCE_BASE_CREDITS.pro.image_to_image),
                String(IMAGE_EXPERIENCE_BASE_CREDITS.premium.image_to_image),
              ],
              [
                "Multi-image (per job)",
                String(IMAGE_EXPERIENCE_BASE_CREDITS.standard.multi_image),
                String(IMAGE_EXPERIENCE_BASE_CREDITS.pro.multi_image),
                String(IMAGE_EXPERIENCE_BASE_CREDITS.premium.multi_image),
              ],
            ]}
          />
          <p className="mt-3 text-xs text-neutral-500">
            Path-specific tables also exist (Standard SD/HD steps, Premium by quality, Ultra multi by count). Charges
            run only after successful generation. Failed runs do not deduct. Tags do not add a second billing system.
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            Path reference — Standard T2I SD {STANDARD_CREDITS.textToImageSd} / HD {STANDARD_CREDITS.textToImageHd};
            Premium T2I SD–2K {PREMIUM_T2I_CREDITS.sd}–{PREMIUM_T2I_CREDITS["2k"]}; Ultra T2I SD–4K{" "}
            {ULTRA_T2I_CREDITS.sd}–{ULTRA_T2I_CREDITS["4k"]} (Ultra 8K surface +{ULTRA_8K_EXTRA_CREDITS} on eligible
            plans).
          </p>

          <h3 className="mt-10 text-base font-semibold text-neutral-900">Quality (SD → 8K)</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Quality selects target resolution / delivery class. Exact pixel size depends on aspect ratio and backend
            limits. Do not read credit amounts from quality chips.
          </p>
          <Table
            accent={IMAGE_ACCENT}
            headers={["Quality", "Approx 1:1", "Approx 16:9", "Typical use"]}
            rows={qualityRows}
          />
          <p className="mt-2 text-xs text-neutral-500">
            8K is plan-gated for Ultra AI. Unavailable qualities must not be advertised as working.
          </p>

          <h3 className="mt-10 text-base font-semibold text-neutral-900">Aspect ratio</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Aspect ratio is the shape of the frame. Not every ratio is available on every generation path — the UI and
            server must respect the selected route.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3" aria-hidden>
            {[
              { r: "1:1", w: 40, h: 40 },
              { r: "4:5", w: 36, h: 45 },
              { r: "16:9", w: 56, h: 32 },
              { r: "9:16", w: 28, h: 50 },
              { r: "IMAX", w: 50, h: 35 },
            ].map((b) => (
              <div key={b.r} className="flex flex-col items-center gap-1">
                <div
                  className="rounded-sm border-2 border-orange-400/80 bg-orange-50"
                  style={{ width: b.w, height: b.h }}
                />
                <span className="text-[10px] font-medium text-neutral-600">{b.r}</span>
              </div>
            ))}
          </div>
          <Table
            accent={IMAGE_ACCENT}
            headers={["Ratio", "Shape", "Typical use", "Notes"]}
            rows={aspectRows}
          />

          <h3 className="mt-10 text-base font-semibold text-neutral-900">Watermark controls</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Free-plan downloads are stamped with Motio2edit branding (primary + secondary marks). Paid plans can opt
            out or keep a watermark via preference. Admins are not forced. Finalization runs server-side after
            generation (<code className="rounded bg-neutral-100 px-1 text-[11px]">finalizeMediaAsset</code>) before
            history and download URLs are returned.
          </p>

          <h3 className="mt-10 text-base font-semibold text-neutral-900">
            Semantic tags ({tagCount} active · max {MAX_SEMANTIC_TAGS} per request)
          </h3>
          <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm text-neutral-800">
            <strong>Fundamental rule:</strong> the first image is always the base image. Later images attached after a
            tag are references for that tagged attribute only — they do not become the new base.
          </p>
          <p className="mt-3 text-sm text-neutral-700">
            Tags are semantic controls, not separate AI models. Users see short labels like{" "}
            <span className="font-medium text-violet-700">@Outfit</span>; the backend injects a precise edit
            instruction (region to change, what to preserve). Multiple tags compose. Aliases such as clothes→clothing,
            bg→background, footwear→shoes are normalized in the registry.
          </p>

          <div className="mt-4 space-y-3 text-sm text-neutral-700">
            <p>
              <strong className="text-neutral-900">With references:</strong> Img 1 + @Outfit + Img 2 → keep person,
              face, pose, and scene from Img 1; use Img 2 for outfit only.
            </p>
            <p>
              <strong className="text-neutral-900">Multiple refs:</strong> Img 1 + @Outfit Img 2 + @Accessory Img 3 →
              base stays Img 1; outfit from 2; accessories from 3.
            </p>
            <p>
              <strong className="text-neutral-900">Tag without reference:</strong> @Background + “sunset sky” targets
              the background only from the prompt — no second image required.
            </p>
          </div>

          <h4 className="mt-6 text-sm font-semibold text-neutral-900">How to use tags</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>Write a clear action in natural language; add tags when you need a precise target.</li>
            <li>Tags layer onto the prompt — they do not replace it.</li>
            <li>Normal prompts still work with zero tags.</li>
            <li>
              Small wording or placement mistakes can change meaning; results are not guaranteed deterministic for
              every phrasing.
            </li>
          </ul>

          <h4 className="mt-6 text-sm font-semibold text-neutral-900">Prompt guide</h4>
          <p className="mt-2 text-sm text-neutral-700">
            <strong>Good:</strong> action + target + desired result + constraints (“Change the jacket on the person to
            black leather; keep face and background”).
          </p>
          <p className="mt-1 text-sm text-neutral-700">
            <strong>Avoid:</strong> vague asks, contradictory instructions, unclear which image is base, or tags
            placed so references attach to the wrong attribute.
          </p>

          <StepDiagram
            accent={IMAGE_ACCENT}
            steps={["Prompt", "Base image", "Tag(s)", "Reference(s)", "Semantic rules", "Generate", "Result"]}
          />

          <h4 className="mt-8 text-sm font-semibold text-neutral-900">Full tag reference (from registry)</h4>
          <p className="mt-1 text-xs text-neutral-500">
            Generated from <code className="rounded bg-neutral-100 px-1">SEMANTIC_TAG_REGISTRY</code> — same source as
            the editor.
          </p>
          {[...tagsByCategory.entries()].map(([cat, tags]) => (
            <div key={cat} className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{cat}</p>
              <ul className="mt-2 space-y-2">
                {tags.map((t) => (
                  <li key={t.id} className="rounded-lg border border-neutral-200 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", t.color)}>
                        {t.label}
                      </span>
                      <span className="text-xs text-neutral-500">{t.guidance}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      Targets this region/attribute; preserves unrelated content unless the prompt asks otherwise.
                      Reference image optional — when supplied after the tag, it drives that attribute only.
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      Example: base photo + {t.label} + optional reference for that attribute.
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <Divider />

        <section id="video-studio" aria-labelledby="video-studio-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VIDEO_ACCENT }}>
            Studio
          </p>
          <h2 id="video-studio-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Video Studio
          </h2>
          <p className="mt-4 text-sm text-neutral-500">
            Product specification for Video Studio is still being finalized. Credit tables and feature details will be
            documented here without inventing unfinished capabilities.
          </p>
        </section>

        <Divider />

        <section id="music-studio" aria-labelledby="music-studio-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUSIC_ACCENT }}>
            Studio
          </p>
          <h2 id="music-studio-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Music Studio
          </h2>
          <p className="mt-4 text-sm text-neutral-500">
            Product specification for Music Studio is still being finalized. Credit tables and feature details will be
            documented here without inventing unfinished capabilities.
          </p>
        </section>

        <Divider />

        <section id="maluto-ai" aria-labelledby="maluto-h" className="scroll-mt-24">
          <h2 id="maluto-h" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            {AUTO_EDIT_PRODUCT_NAME}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            {AUTO_EDIT_PRODUCT_NAME} is for users who want the system to analyse a photo and decide the edit workflow
            instead of specifying every operation manually. Upload one image; analysis, edit decision, generation, and
            validation run as one job.
          </p>
          <StepDiagram
            accent={MALUTO_ACCENT}
            steps={["Input image", "Analysis", "Understanding", "Edit decision", "Generation", "Validation", "Result"]}
          />
          <h3 className="mt-8 text-base font-semibold text-neutral-900">Credits</h3>
          <p className="mt-2 text-sm text-neutral-700">
            One total charge per successful job. Analysis is not billed separately. NO_CHANGE does not charge.
          </p>
          <Table
            accent={MALUTO_ACCENT}
            headers={["Quality", "Credits"]}
            rows={(
              Object.keys(AUTO_EDIT_CREDITS_BY_QUALITY) as (keyof typeof AUTO_EDIT_CREDITS_BY_QUALITY)[]
            ).map((q) => [q, String(AUTO_EDIT_CREDITS_BY_QUALITY[q])])}
          />
        </section>

        <Divider />

        <section id="circle-2edit" aria-labelledby="circle-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: CIRCLE }}>
            Circle 2edit
          </p>
          <h2 id="circle-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Circle 2edit
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Circle 2edit is the mask-first tool for precise local edits on a photo. Remove reconstructs a marked
            region; Add synthesizes new content into a painted placement. Both stay inside one product section — not
            separate About pages.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Remove</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Upload → mark with circle/brush → refine → Remove Object → analyse → reconstruct → result. Only the marked
            region is edited.
          </p>
          <StepDiagram steps={["Upload", "Mark", "Refine", "Remove", "Reconstruct", "Result"]} />

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Add</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Upload → choose object from catalog → confirm factors → paint placement → generate → result. The object is
            matched to lighting and perspective of the scene.
          </p>
          <StepDiagram steps={["Upload", "Choose object", "Confirm", "Paint placement", "Generate", "Result"]} />

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Tools</h3>
          <ul className="mt-2 space-y-2 text-sm text-neutral-700">
            <li>🖌️ <strong>Brush</strong> — paint precise mask regions for complex shapes.</li>
            <li>⭕ <strong>Circle (A→B)</strong> — freehand outline; closes when endpoints meet.</li>
            <li>🧽 <strong>Eraser</strong> — correct the mask without starting over.</li>
            <li>↩️ <strong>Undo</strong> — step back one mask change.</li>
            <li>↪️ <strong>Redo</strong> — restore an undone mask change.</li>
            <li>🧹 <strong>Clear</strong> — wipe the current mask.</li>
            <li>📊 <strong>Status / progress</strong> — shows readiness and generation stages.</li>
            <li>▶️ <strong>Action bar</strong> — Remove Object / Add Object and related controls.</li>
          </ul>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Credits</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Circle Remove is a flat <strong>{CIRCLE_REMOVE_CREDITS}</strong> credits (server-authoritative). Circle Add
            = input-image band by megapixels (e.g. ≤1 MP → {CIRCLE_ADD_BASE_BY_MP[0].credits} … ≤8 MP →{" "}
            {CIRCLE_ADD_BASE_BY_MP[CIRCLE_ADD_BASE_BY_MP.length - 1].credits}) plus the selected object’s catalog cost.
            Paid plan required for Add.
          </p>
        </section>

        <Divider />

        <section id="filters" aria-labelledby="filters-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Tools</p>
          <h2 id="filters-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Filters
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Filters are visual treatments that change the appearance, style, and tonal character of an image — mood,
            color, contrast, warmth/coolness, cinematic grades, black-and-white, vintage, and portrait looks.
            Motio2edit currently ships <strong>{filterCount}</strong> filters from the product registry.
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            Catalog: {filterNames.slice(0, 20).join(", ")}
            {filterNames.length > 20 ? `, … (+${filterNames.length - 20} more)` : ""}.
          </p>
        </section>

        <Divider />

        <section id="lenses" aria-labelledby="lenses-h" className="scroll-mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Tools</p>
          <h2 id="lenses-h" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Lenses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Lenses influence photographic character: field of view feel, perspective cues, depth of field, background
            separation, and optical mood — not only color grading. Motio2edit currently lists{" "}
            <strong>{lensCount}</strong> lenses in the registry.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4" aria-hidden>
            <div className="text-center">
              <div className="mx-auto h-10 w-16 rounded-full border-2 border-neutral-400 bg-neutral-100" />
              <p className="mt-1 text-[10px] text-neutral-500">Wide FOV</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-400 bg-neutral-100" />
              <p className="mt-1 text-[10px] text-neutral-500">Standard</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-10 w-6 rounded-full border-2 border-neutral-400 bg-neutral-100" />
              <p className="mt-1 text-[10px] text-neutral-500">Tele / portrait</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Examples: {lensNames.slice(0, 12).join(", ")}
            {lensNames.length > 12 ? ` … (+${lensNames.length - 12} more)` : ""}.
          </p>
        </section>

        <Divider />

        <section className="pb-8 text-center">
          <p className="text-base text-neutral-600">Ready when you are.</p>
          <div className="mt-5">
            <Button asChild size="lg" className="min-h-11 px-8 text-base">
              <Link to="/">Try Now</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
