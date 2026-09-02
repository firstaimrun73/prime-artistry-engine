/**
 * About Product — canonical editorial page (/about)
 * Spec: Motio2edit About Product Master Spec (Parts 1–25)
 * Layout: white page, black ink, section hierarchy, process diagrams — not card-grid SaaS.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEMANTIC_TAG_REGISTRY } from "@/lib/studio/image/tag-semantic-registry";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      {
        title: "About Product — Motio2edit",
      },
      {
        name: "description",
        content:
          "Motio2edit brings Studio, Circle 2edit, Maluto AI, Filters, and Lenses together — create, edit, and reimagine images, video, and music with AI.",
      },
      { property: "og:title", content: "About Product — Motio2edit" },
      {
        property: "og:description",
        content:
          "One place to create, edit, and reimagine images, video, and music with AI. Studio, Circle 2edit, Maluto AI, Filters, and Lenses.",
      },
    ],
  }),
  component: AboutProductPage,
});

const CIRCLE = "#7B6FE0";
const IMAGE_ACCENT = "oklch(0.70 0.19 45)";
const VIDEO_ACCENT = "oklch(0.55 0.22 25)";
const MUSIC_ACCENT = "oklch(0.58 0.22 310)";

function r2Base(): string {
  try {
    const base =
      (typeof import.meta !== "undefined" &&
        (import.meta as { env?: Record<string, string> }).env?.VITE_R2_PUBLIC_URL) ||
      "";
    return String(base || "").replace(/\/$/, "");
  } catch {
    return "";
  }
}

function gizaUrl(key: "before" | "mark" | "after"): string {
  const base = r2Base();
  const path = `circle/samples/remove/giza-${key}.jpg`;
  if (base) return `${base}/${path}`;
  return `/${path}`;
}

function Divider() {
  return <hr className="my-14 border-0 border-t border-neutral-200 sm:my-16" />;
}

function StepDiagram({
  steps,
  accent = CIRCLE,
}: {
  steps: string[];
  accent?: string;
}) {
  return (
    <ol className="mt-6 flex flex-wrap gap-2 sm:gap-3" aria-label="Process steps">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
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

function GizaThreeStage() {
  const stages = [
    { key: "before" as const, label: "1 · Before", caption: "Original scene" },
    { key: "mark" as const, label: "2 · Mark", caption: "Localized selection" },
    { key: "after" as const, label: "3 · After", caption: "Subject removed" },
  ];
  return (
    <figure className="mt-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {stages.map((s) => (
          <div key={s.key} className="flex flex-col">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-neutral-100 ring-1 ring-neutral-200">
              <img
                src={gizaUrl(s.key)}
                alt={`Giza pyramids — ${s.caption}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-2 text-xs font-medium tracking-wide text-neutral-600">
              <span style={{ color: CIRCLE }}>{s.label}</span>
              <span className="text-neutral-400"> — </span>
              {s.caption}
            </figcaption>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        Same photograph at three stages: original, localized lavender mark over the crowd region, then
        reconstructed result with the marked subjects removed. Production media is served from R2 at{" "}
        <code className="rounded bg-neutral-100 px-1 text-[11px]">
          circle/samples/remove/giza-&#123;before,mark,after&#125;.jpg
        </code>
        .
      </p>
    </figure>
  );
}

function TagChips() {
  const show = SEMANTIC_TAG_REGISTRY.filter((t) =>
    ["outfit", "person", "background", "lighting", "color", "face", "hair"].includes(t.id),
  );
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Image Studio semantic tags">
      {show.map((t) => (
        <li
          key={t.id}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.color}`}
        >
          {t.label}
        </li>
      ))}
    </ul>
  );
}

function AboutProductPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-20 border-b border-neutral-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/profile"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Motio2edit
            </p>
            <p className="truncate text-sm font-medium text-neutral-900">About Product</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <section aria-labelledby="about-hero">
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: IMAGE_ACCENT }}
          >
            Motio2edit
          </p>
          <h1
            id="about-hero"
            className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl sm:leading-tight"
          >
            One place to create, edit, and reimagine images, video, and music with AI.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-700 sm:text-lg">
            Motio2edit brings your creative tools together in one product: generate and edit images in
            Studio, circle exactly what you want changed with Circle{" "}
            <span className="whitespace-nowrap">
              <span
                className="inline-block h-[0.55em] w-[0.55em] translate-y-[-0.05em] rounded-full align-middle"
                style={{ backgroundColor: CIRCLE }}
                aria-hidden
              />{" "}
              2edit
            </span>
            , hand off routine edits to Maluto AI, and shape the final look with Filters and Lenses.
            Everything is built around one idea — you stay in control of the creative decision, and the
            AI handles the work.
          </p>
        </section>

        <Divider />

        <section aria-labelledby="what-is">
          <h2 id="what-is" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            What Motio2edit is
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Motio2edit is a creative editing product built around three ways of working:{" "}
            <strong className="font-medium text-neutral-900">Studio</strong>, where you generate and
            produce image, video, and music from scratch or from references;{" "}
            <strong className="font-medium text-neutral-900">Circle 2edit</strong>, where you mark
            exactly what to remove or add directly on a photo; and{" "}
            <strong className="font-medium text-neutral-900">Maluto AI</strong>, where the product makes
            the edit decision for you. Filters and Lenses sit alongside all three, shaping the final
            visual result.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Each part is built for a different moment in a creative workflow — starting something new,
            refining a specific detail, or finishing the look.
          </p>
        </section>

        <Divider />

        <section aria-labelledby="image-studio">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: IMAGE_ACCENT }}>
            Studio
          </p>
          <h2 id="image-studio" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Image Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Image Studio is where you generate new images and edit existing ones with natural-language
            prompts and optional reference images. You can start from text alone, guide an edit with a
            single reference, or combine multiple references. Semantic tags such as{" "}
            <span className="font-medium text-violet-700">@Outfit</span> associate a reference with a
            specific editing intent so the model focuses on the right region.
          </p>
          <p className="mt-3 text-sm text-neutral-600">
            Tags are defined in the product registry — not invented here. Representative tags:
          </p>
          <TagChips />
          <StepDiagram
            accent={IMAGE_ACCENT}
            steps={["Prompt / references", "Tags (optional)", "Generate", "Result"]}
          />
        </section>

        <Divider />

        <section aria-labelledby="video-studio">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VIDEO_ACCENT }}>
            Studio
          </p>
          <h2 id="video-studio" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Video Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Video Studio is for creating and editing short video from text and image inputs. Describe the
            motion, style, and subject; the product routes the request through the video generation
            pipeline. Use it when the result needs time and movement rather than a single still frame.
          </p>
          <StepDiagram
            accent={VIDEO_ACCENT}
            steps={["Prompt / stills", "Generate", "Review", "Export"]}
          />
        </section>

        <Divider />

        <section aria-labelledby="music-studio">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUSIC_ACCENT }}>
            Studio
          </p>
          <h2 id="music-studio" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Music Studio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Music Studio generates original tracks from text descriptions of mood, genre, and structure.
            It sits alongside Image and Video so sound can be part of the same creative session rather
            than a separate product.
          </p>
          <StepDiagram
            accent={MUSIC_ACCENT}
            steps={["Describe", "Generate", "Listen", "Use"]}
          />
        </section>

        <Divider />

        <section aria-labelledby="circle-remove">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: CIRCLE }}>
            Circle 2edit
          </p>
          <h2 id="circle-remove" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Remove
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Point at what should not be there. Circle 2edit removes it.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Circle Remove lets you mark an unwanted subject or object directly on a photo with a brush.
            Only the marked region is edited; the rest of the image is preserved. The product analyses
            the selection and its surroundings, removes the marked content, and reconstructs the area so
            it matches the rest of the scene.
          </p>
          <StepDiagram
            steps={[
              "Upload",
              "Mark",
              "Purple selection",
              "Analyse",
              "Removing",
              "Generating",
              "Result",
            ]}
          />
          <GizaThreeStage />
        </section>

        <Divider />

        <section aria-labelledby="circle-add">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: CIRCLE }}>
            Circle 2edit
          </p>
          <h2 id="circle-add" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Add
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Choose what belongs in the frame. Place it exactly where you want it.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Circle Add works the other way: instead of removing something, you bring a new object into a
            real photo. Choose what you want to add, confirm it, then paint where it should sit — Circle
            2edit generates it in place, matched to the lighting and perspective of the original photo.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            The Add catalog includes animals (cat, dog, bird, rabbit, fox, deer, horse, owl, swan,
            squirrel) and objects (shoe, hat, glasses, vase, cake, car, bicycle, scooter, motorcycle, bus,
            tree).
          </p>
          <StepDiagram
            steps={[
              "Upload",
              "Choose object",
              "Confirm",
              "Paint placement",
              "Generate",
              "Result",
            ]}
          />
        </section>

        <Divider />

        <section aria-labelledby="maluto">
          <h2 id="maluto" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Maluto AI
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Hand the AI the photo. It reads the scene and makes the edit for you.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Maluto AI is Motio2edit's automatic editing mode. Where Studio and Circle 2edit ask you
            to direct the result, Maluto AI looks at an image, understands what it needs, and makes the
            edit decision itself — useful when you want a strong result fast, without specifying every
            step.
          </p>
          <StepDiagram
            accent="oklch(0.55 0.12 250)"
            steps={["Image", "AI analysis", "Scene understanding", "Edit decision", "Result"]}
          />
        </section>

        <Divider />

        <section aria-labelledby="filters">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Tools
          </p>
          <h2 id="filters" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Filters
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Set the mood of a photo in one tap. Filters apply a consistent visual treatment — color,
            tone, and contrast — styled after real photographic looks rather than generic app presets.
          </p>
        </section>

        <Divider />

        <section aria-labelledby="lenses">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Tools
          </p>
          <h2 id="lenses" className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Lenses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Change how the camera sees, not just how the photo looks. Lenses relate to optical and
            perspective effects — depth, focus, framing — rather than color treatment alone.
          </p>
        </section>

        <Divider />

        <section aria-labelledby="ecosystem">
          <h2 id="ecosystem" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            How the ecosystem connects
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Studio starts something new. Circle 2edit refines exactly what you point at. Maluto AI takes
            a first pass automatically. Filters and Lenses finish the look. Together they cover the full
            range from a blank page to a final, polished image, video, or track.
          </p>
        </section>

        <Divider />

        <section aria-labelledby="faq">
          <h2 id="faq" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            FAQ
          </h2>
          <dl className="mt-6 space-y-6">
            <div>
              <dt className="text-sm font-semibold text-neutral-900">
                Do I need to know how to write prompts?
              </dt>
              <dd className="mt-1.5 text-base leading-relaxed text-neutral-700">
                No — Circle 2edit and Maluto AI work directly on your photo without requiring a written
                prompt. Studio supports prompts for people who want that level of control.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-900">
                Will Circle 2edit change anything outside what I circle?
              </dt>
              <dd className="mt-1.5 text-base leading-relaxed text-neutral-700">
                No. Only the marked area is edited; the rest of the photo is preserved.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-900">
                What happens to the objects or animals I add with Circle Add?
              </dt>
              <dd className="mt-1.5 text-base leading-relaxed text-neutral-700">
                They're generated to match the lighting, scale, and perspective of your original
                photo, based on the object you chose.
              </dd>
            </div>
          </dl>
        </section>

        <Divider />

        <section aria-labelledby="final-cta" className="pb-8 text-center">
          <h2 id="final-cta" className="sr-only">
            Try Motio2edit
          </h2>
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
