import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Image as ImageIcon, Video, Music, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/home/HomeHero";
import { BeforeAfterShowcase } from "@/components/home/BeforeAfterShowcase";
import { ArchitectureFlowSection } from "@/components/home/ArchitectureFlowSection";
import { PreLoginSampleStrip } from "@/components/home/PreLoginSampleStrip";
import { PrivacyPhilosophySection } from "@/components/home/PrivacyPhilosophySection";
import { FloatingLanguageButton } from "@/components/FloatingLanguageButton";
import { useAuth } from "@/lib/auth";
import { listPublicFeedback } from "@/lib/feedback.functions";
import { FeedbackCard } from "@/components/FeedbackCard";
import { TrustSection } from "@/components/TrustSection";
import { FinalCTA } from "@/components/home/FinalCTA";
import { pageHead, SITE_BRAND_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: `${SITE_NAME} — AI Photo & Video Editor`,
      description: SITE_BRAND_DESCRIPTION,
      path: "/",
    }),
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  // Signed-in users land on the unified Studio (Image / Video / Music)
  if (user) return <Navigate to="/motion2ai" search={{ mode: "image" }} />;
  return <SignedOutHome />;
}

function SignedOutHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HomeHero />
      <StudioPreviewSection />
      <PreLoginSampleStrip />
      <BeforeAfterShowcase />
      <PrivacyPhilosophySection />
      <ArchitectureFlowSection />
      <AiToolsSection />
      <TrustSection />
      <HomeTestimonials />
      <FinalCTA />
      <Footer />
      <FloatingLanguageButton />
    </div>
  );
}

/** Unified Studio preview — not three separate studio cards */
function StudioPreviewSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:pb-16">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-lg backdrop-blur-xl">
        <div className="border-b border-border/50 bg-background/50 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Motio2edit
                </p>
                <p className="text-sm font-extrabold tracking-tight">Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card/80 p-1">
              {(
                [
                  { id: "image", label: "Image", Icon: ImageIcon },
                  { id: "video", label: "Video", Icon: Video },
                  { id: "music", label: "Music", Icon: Music },
                ] as const
              ).map(({ id, label, Icon }) => (
                <span
                  key={id}
                  className={
                    id === "image"
                      ? "inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      : "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 py-8 text-center sm:px-8 sm:py-10">
          <p className="text-lg font-extrabold tracking-tight sm:text-xl">What will you create today?</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            One studio for Image, Video, and Music. Explore samples freely — sign in when you are ready
            to generate.
          </p>
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-left text-sm text-muted-foreground shadow-inner">
            <span className="text-foreground/80">Describe a sunset cityscape in cinematic light…</span>
          </div>
          <Button asChild className="mt-6 gap-2 rounded-full" size="lg">
            <Link to="/motion2ai" search={{ mode: "image" }}>
              Open Studio <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** AI editing tools — separate from primary Studio generation */
function AiToolsSection() {
  const tools = [
    { name: "Circle 2edit", href: "/studio/image/circle-remove" as const },
    { name: "Frames", href: "/studio/frames" as const },
    { name: "Remove BG", href: "/studio/image/remove-bg" as const },
    { name: "Filters", href: "/studio/image/filters" as const },
    { name: "Cropmix", href: "/studio/cropmix" as const },
    { name: "Maluto AI", href: "/studio/image/auto-edit" as const },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:pb-16">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">AI Tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Editing utilities — separate from Image / Video / Music generation in Studio.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tools.map((t) => (
          <Link
            key={t.name}
            to={t.href}
            className="rounded-2xl border border-border/70 bg-card/60 px-3 py-4 text-center text-sm font-semibold backdrop-blur-md transition hover:border-primary/40 hover:shadow-md"
          >
            {t.name}
          </Link>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Button asChild variant="outline" size="sm">
          <Link to="/studio">All AI Tools</Link>
        </Button>
      </div>
    </section>
  );
}

function HomeTestimonials() {
  const fetchFeedback = useServerFn(listPublicFeedback);
  const { data } = useQuery({
    queryKey: ["public-feedback", "home"],
    queryFn: () => fetchFeedback(),
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">What creators are saying</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
        Feedback from people using Motio2edit — not staged quotes.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 6).map((f) => (
          <FeedbackCard key={f.id} f={f} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link to="/feedback">See more feedback</Link>
        </Button>
      </div>
    </section>
  );
}
