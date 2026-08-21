import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Download, Zap, Wand2, Lock, ArrowRight, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { listPublicFeedback } from "@/lib/feedback.functions";
import { FeedbackCard } from "@/routes/feedback";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { SampleShowcase } from "@/components/SampleShowcase";
import { SampleGallery } from "@/components/SampleGallery";
import { MusicSamples } from "@/components/MusicSamples";
import { VideoSamples } from "@/components/VideoSamples";
import { HomeHero } from "@/components/home/HomeHero";
import { BeforeAfterShowcase } from "@/components/home/BeforeAfterShowcase";
import { TrustSection } from "@/components/home/TrustSection";
import { WhyChoose } from "@/components/home/WhyChoose";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { FinalCTA } from "@/components/home/FinalCTA";
import { SignedInHomeBody } from "@/components/home/SignedInHomeBody";

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

/** Post-login home: no site Footer (avoids repeated resource strip). */
function SignedInHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SignedInHomeBody />
    </div>
  );
}

function SignedOutHome() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HomeHero />
      <BeforeAfterShowcase />
      <SampleShowcase />
      <SampleGallery />
      <MusicSamples />
      <VideoSamples />
      <StudioLoopingShowcase />
      <StudioShowcase />
      <TrustSection />
      <WhyChoose />
      <MusicHomeSection />
      <TestimonialsCarousel />
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
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Loved by creators worldwide 🌍</h2>
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

function MusicHomeSection() {
  const items = [
    { icon: Music, title: "AI Music Generation", desc: "Create original tracks from text prompts" },
    { icon: Video, title: "Cinematic Soundtracks", desc: "Epic music for videos and presentations" },
    { icon: Zap, title: "Background Music", desc: "Perfect ambient music for any project" },
    { icon: Wand2, title: "Any Genre & Mood", desc: "Hip-hop, classical, lo-fi, electronic and more" },
    { icon: Download, title: "Instant Generation", desc: "Your custom track ready in under a minute" },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:pb-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">AI Music Studio</h2>
        <p className="mt-2 text-muted-foreground">Generate original music in seconds</p>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {items.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-8 text-center">
        <Button asChild size="lg">
          <Link to="/studio/music">Open Music Studio</Link>
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
        <p className="mt-2 text-sm text-muted-foreground">Pick a studio to jump straight into the right tools.</p>
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
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-primary/40"
            >
              <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${c.accent} opacity-30 blur-3xl`} />
              <div className="relative flex items-center gap-3">
                <div className="rounded-xl border border-border bg-background/60 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">{c.name}</h3>
                {c.freeAllowed && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Free</span>
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
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    View plans <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

type LoopSlide = {
  label: string;
  tagline: string;
  icon: typeof ImageIcon;
  bg: string;
};

const LOOP_SLIDES: LoopSlide[] = [
  {
    label: "Image Studio",
    tagline: "Remove, restore, restyle",
    icon: ImageIcon,
    bg: "linear-gradient(135deg,#fff7ed 0%,#fdba74 45%,#f97316 100%)",
  },
  {
    label: "Video Studio",
    tagline: "Cinematic motion, on demand",
    icon: Video,
    bg: "linear-gradient(135deg,#fee2e2 0%,#f87171 45%,#dc2626 100%)",
  },
  {
    label: "Music Studio",
    tagline: "Sunset aura soundtracks",
    icon: Music,
    bg: "linear-gradient(135deg,#4B0082 0%,#8B008B 50%,#FF69B4 100%)",
  },
];

function StudioLoopingShowcase() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % LOOP_SLIDES.length), 4000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % LOOP_SLIDES.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + LOOP_SLIDES.length) % LOOP_SLIDES.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchX.current;
    const end = e.changedTouches[0]?.clientX ?? null;
    if (start != null && end != null) {
      const dx = end - start;
      if (Math.abs(dx) > 40) {
        setIdx((i) => (i + (dx < 0 ? 1 : -1) + LOOP_SLIDES.length) % LOOP_SLIDES.length);
      }
    }
    touchX.current = null;
    setTimeout(() => setPaused(false), 500);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:pb-12">
      <div
        className="glass-panel relative mx-auto overflow-hidden rounded-3xl p-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative h-52 sm:h-72 lg:h-80">
          {LOOP_SLIDES.map((s, i) => {
            const Icon = s.icon;
            const active = i === idx;
            return (
              <div
                key={s.label}
                aria-hidden={!active}
                className="absolute inset-0 flex items-center justify-center rounded-3xl transition-opacity duration-700 ease-in-out"
                style={{ background: s.bg, opacity: active ? 1 : 0 }}
              >
                <div className="flex flex-col items-center gap-3 text-center text-white drop-shadow-lg">
                  <Icon className="h-14 w-14" strokeWidth={1.5} />
                  <div className="text-2xl font-extrabold tracking-tight sm:text-4xl">{s.label}</div>
                  <div className="text-sm opacity-90 sm:text-base">{s.tagline}</div>
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
                    Powered by Motion2AI
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {LOOP_SLIDES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              aria-label={`Show ${s.label}`}
              onClick={() => setIdx(i)}
              className={
                "h-2 rounded-full transition-all " +
                (i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80")
              }
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        A single hub for image, video, and music — powered by Motion2AI.
      </p>
    </section>
  );
}
