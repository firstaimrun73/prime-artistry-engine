import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Video,
  Music,
  Tags,
  Layers,
  Sparkles,
  CircleDot,
  CreditCard,
  GraduationCap,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      {
        title: "About — Motio2edit by Motion2AI",
      },
      {
        name: "description",
        content:
          "Learn how Motio2edit Image, Video, and Music studios work — prompts, semantic tags, single and multi-reference editing, 4K, credits, and practical examples.",
      },
      { property: "og:title", content: "About — Motio2edit" },
    ],
  }),
  component: AboutPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ImageIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Motio2edit
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            About the product
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Motio2edit is an AI creative studio for images, video, and music.
            This page explains the tools, how prompts and tags work, reference
            images, quality tiers, and how credits map to infrastructure cost.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/features">Explore features</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <Section icon={ImageIcon} title="Image Studio">
            <p>
              Image Studio covers text-to-image, single-image editing, and
              multi-reference editing. You describe the change in natural
              language; the backend routes to the right model for your mode
              (Standard or Premium) and reference count.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">0 references</strong> —
                text-to-image generation.
              </li>
              <li>
                <strong className="text-foreground">1 reference</strong> —
                image-to-image / guided edit of a single source.
              </li>
              <li>
                <strong className="text-foreground">2+ references</strong> —
                multi-reference edit (identity, outfit, style, or scene
                consistency across sources).
              </li>
            </ul>
            <p>
              Standard supports up to 5 total images on multi-reference paths;
              Premium supports up to 10. Quality options (SD / HD / 2K where
              allowed) change credit cost, not the prompt language.
            </p>
          </Section>

          <Section icon={Tags} title="Semantic tags (@prompts)">
            <p>
              Tags like <code className="text-foreground">@outfit</code>,{" "}
              <code className="text-foreground">@hair</code>,{" "}
              <code className="text-foreground">@face</code>, and{" "}
              <code className="text-foreground">@background</code> are not
              separate AI models. They expand into deterministic semantic
              instructions that are composed into your final generation prompt.
            </p>
            <p>
              Flow: choose tags in the editor → tags are normalized against the
              shared registry → each tag contributes a clear edit target → the
              combined instruction is sent with your written request to the
              existing Image Studio model path.
            </p>
            <p>
              No-tag requests stay identical to a plain prompt. Multiple tags
              stack as ordered targets without inventing a second generation
              pipeline.
            </p>
          </Section>

          <Section icon={Layers} title="Single vs multiple references">
            <p>
              <strong className="text-foreground">Single reference</strong> is
              ideal when one photo is the source of truth (change clothing,
              background, or lighting on that person/scene).
            </p>
            <p>
              <strong className="text-foreground">Multiple references</strong>{" "}
              let you pull structure from several images — for example identity
              from photo A, outfit from photo B, and environment from photo C.
              The product treats the primary image plus additional reference
              URLs as the full set sent to multi-reference models.
            </p>
          </Section>

          <Section icon={CircleDot} title="Circle 2edit">
            <p>
              Circle 2edit is the mask-first tool for precise local edits.
              Draw a freehand circle or paint a region, then:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Remove</strong> — clean
                object removal inside the mask.
              </li>
              <li>
                <strong className="text-foreground">Add</strong> — place an
                asset (bird, guitar, snake, and 150+ gallery items) or a custom
                description into the masked region with perspective-aware
                blending.
              </li>
            </ul>
            <p>
              Results open in Output first; Compare is a slider only (no stacked
              before/after). Branding uses Motio2edit dark violet (#7B6FE0).
            </p>
          </Section>

          <Section icon={Video} title="Video Studio">
            <p>
              Generate motion from text or animate a still image. Video tools
              share the same account, plan gates, and credit economy as Image
              Studio, with separate model endpoints and prompt length limits
              appropriate for temporal generation.
            </p>
          </Section>

          <Section icon={Music} title="Music Studio">
            <p>
              Prompt-to-music generation with genre, mood, and tempo controls.
              Tracks are designed for quick previews and downloads under the
              same Motio2edit account.
            </p>
          </Section>

          <Section icon={Sparkles} title="Quality, 4K, and output">
            <p>
              Image quality tiers (SD, HD, and 2K/4K-class where the plan allows)
              trade compute for resolution and detail. Higher tiers cost more
              credits because they consume more model capacity and storage
              bandwidth. Aspect ratio does not add extra credit fees on the
              multi-reference GPT Image 2 paths.
            </p>
          </Section>

          <Section icon={CreditCard} title="Credits and infrastructure">
            <p>
              Credits are a transparent map of real generation cost: model
              inference, mask processing, storage, and delivery. Free plans keep
              a Motio2edit watermark on downloads; paid plans can toggle
              watermark preference. Server-side checks always run before a paid
              model call so you are not charged for rejected requests.
            </p>
          </Section>

          <Section icon={GraduationCap} title="How to use it">
            <p>
              <strong className="text-foreground">Beginner</strong> — upload one
              photo, write a short instruction (“make the sky sunset”), generate.
            </p>
            <p>
              <strong className="text-foreground">Intermediate</strong> — add{" "}
              <code className="text-foreground">@outfit</code> or{" "}
              <code className="text-foreground">@background</code> tags, or use
              Circle 2edit to remove a stray object.
            </p>
            <p>
              <strong className="text-foreground">Advanced</strong> — multi-
              reference edits with 2–10 sources, Premium quality tiers, and
              precise mask + asset Add flows for compositing.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> Practical examples
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>
                  “@outfit change to a black tuxedo” on a portrait reference.
                </li>
                <li>
                  Multi-ref: identity photo + product photo → “wear this jacket”.
                </li>
                <li>
                  Circle Add → search “guitar” → mark the hands region → Add
                  Object.
                </li>
                <li>
                  Circle Remove → circle a logo → Remove Object for clean plates.
                </li>
              </ul>
            </div>
          </Section>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/features">Image Studio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/studio/image/circle-info">Circle 2edit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/features">All features</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
