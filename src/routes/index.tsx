import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Lock, ArrowRight, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicFeedback } from "@/lib/feedback.functions";
import { FeedbackCard } from "@/routes/feedback";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { HomeHero } from "@/components/home/HomeHero";
import { BeforeAfterShowcase } from "@/components/home/BeforeAfterShowcase";
import { TrustSection } from "@/components/home/TrustSection";
import { FinalCTA } from "@/components/home/FinalCTA";
import { SignedInHomeBody } from "@/components/home/SignedInHomeBody";
import { CircleSampleGallery } from "@/components/circle-edit/CircleSampleGallery";
import { ImagineGallery } from "@/components/home/ImagineGallery";
import { VideoStudioGallery } from "@/components/home/VideoStudioGallery";
import { MusicStudioGallery } from "@/components/home/MusicStudioGallery";
import { FilterLensHomeSection } from "@/components/home/FilterLensHomeSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Motio2edit — AI Image & Video Editing, Made Simple" },
      {
        name: "description",
        content:
          "Motio2edit: AI image and video editing in one workspace. Remove objects, enhance portraits, change outfits, generate video. Upload, describe, generate.",
      },
      { property: "og:title", content: "Motio2edit — AI Image & Video Editing, Made Simple" },
      {
        property: "og:description",
        content:
          "Edit images and videos with AI. Circle to Remove, background replace, portrait enhance, and more — powered by Motion2AI.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile } = useAuth();
  if (user && profile) return <SignedInHome />;
  return <SignedOutHome />;
}

function SignedInHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SignedInHomeBody />
    </div>
  );
}

/**
 * Signed-out homepage — single coherent premium flow.
 */
function SignedOutHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HomeHero />
      <BeforeAfterShowcase />

      <div className="mx-auto w-full max-w-6xl px-4">
        <CircleSampleGallery />
        <section className="mt-10 space-y-6" data-motion2ai-creation>
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-[20px] font-extrabold tracking-tight sm:text-[22px]">
              <span>
                Motion<span className="text-primary">2</span>AI Creation
              </span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
                fill="currentColor"
              >
                <path d="M12 2l1.2 6.3L19.5 9 13.2 10.7 12 17l-1.2-6.3L4.5 9l6.3-.7L12 2z" />
                <path d="M18.5 14l.6 2.6 2.4.6-2.4.6-.6 2.6-.6-2.6-2.4-.6 2.4-.6.6-2.6z" opacity="0.85" />
                <path d="M5.2 15.5l.45 1.9 1.8.45-1.8.45-.45 1.9-.45-1.9-1.8-.45 1.8-.45.45-1.9z" opacity="0.7" />
              </svg>
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Image, video, and music samples from Motio2edit.
            </p>
          </div>
          <ImagineGallery />
          <VideoStudioGallery />
          <MusicStudioGallery />
        </section>
        <FilterLensHomeSection />
      </div>

      <StudioShowcase />
      <TrustSection />
      <HomeTestimonials />
      <FinalCTA />
      <FooterAd placement="home" />
      <Footer />
    </div>
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
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Loved by creators worldwide</h2>
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

type StudioCardSpec = {
  name: string;
  href: "/studio/image" | "/studio/video" | "/studio/music";
  icon: typeof ImageIcon;
  accent: string;
  bullets: string[];
  freeAllowed: boolean;
};

const STUDIO_CARDS: StudioCardSpec[] = [
  {
    name: "Image Studio",
    href: "/studio/image",
    icon: ImageIcon,
    accent: "gradient-image",
    bullets: ["Remove objects & backgrounds", "Upscale, restore & colorize", "AI headshot & style transfer"],
    freeAllowed: true,
  },
  {
    name: "Video Studio",
    href: "/studio/video",
    icon: Video,
    accent: "gradient-video",
    bullets: ["Text-to-video & image-to-video", "Cinematic camera moves", "Reels & shorts presets"],
    freeAllowed: false,
  },
  {
    name: "Music Studio",
    href: "/studio/music",
    icon: Music,
    accent: "gradient-music",
    bullets: ["Prompt-to-music tracks", "Genre + mood chips", "Up to 3-minute exports"],
    freeAllowed: false,
  },
];

function StudioShowcase() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(profile?.email);
  const plan = profile?.plan ?? "free";
  const isPaid = isAdmin || (plan !== "free" && !!user);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:pb-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Three studios, one workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">Jump straight into the right tools.</p>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {STUDIO_CARDS.map((c) => {
          const locked = !c.freeAllowed && !isPaid;
          const Icon = c.icon;
          const onClick = () => {
            if (locked) navigate({ to: "/pricing" });
            else navigate({ to: c.href });
          };
          return (
            <button
              key={c.name}
              type="button"
              onClick={onClick}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/40 hover:shadow-xl"
            >
              <div
                className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${c.accent} opacity-30 blur-3xl`}
              />
              <div className="relative flex items-center gap-3">
                <div className="rounded-xl border border-border bg-background/60 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">{c.name}</h3>
                {c.freeAllowed && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Free
                  </span>
                )}
              </div>
              <ul className="relative mt-4 space-y-2 text-sm text-muted-foreground">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {locked ? "Upgrade to unlock" : "Open studio"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              {locked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/70 backdrop-blur-sm">
                  <div className="rounded-full border border-border bg-card p-2.5">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm font-semibold">Locked on Free plan</div>
                  <div className="text-xs text-muted-foreground">Upgrade to unlock {c.name}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
