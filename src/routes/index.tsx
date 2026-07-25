import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Download, Zap, Wand2, ShieldCheck, Lock, ArrowRight, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPublicFeedback } from "@/lib/feedback.functions";
import { FeedbackCard } from "@/routes/feedback";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { History as HistoryIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOTIO2EDIT — AI Image, Video & Music Studio by Motion2AI" },
      { name: "description", content: "MOTIO2EDIT, powered by Motion2AI. Upload, prompt, generate and download AI-powered images, videos and music in seconds." },
      { property: "og:title", content: "MOTIO2EDIT — AI Image, Video & Music Studio by Motion2AI" },
      { property: "og:description", content: "Upload, prompt, generate and download AI-powered images, videos and music in seconds." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile } = useAuth();
  if (user && profile) return <SignedInHome />;
  return <SignedOutHome />;
}

function SignedOutHome() {

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" /> Credit-based AI editing
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Transform your media with <span className="text-primary">AI</span>, instantly.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Upload an image or video, write a prompt, and generate a polished result.
          Clean, fast, and built for creators.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/editor">Open editor</Link>
          </Button>
        </div>
      </section>

      <StudioLoopingShowcase />
      <StudioShowcase />


      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: ImageIcon, title: "Image generation", desc: "Available on every plan, including free credits." },
            { icon: Video, title: "Video generation", desc: "Unlock high-quality video on paid plans." },
            { icon: Download, title: "Instant download", desc: "Grab your output the moment it's ready." },
            { icon: Wand2, title: "Prompt-driven", desc: "Describe what you want — no complex tools." },
            { icon: Zap, title: "Priority processing", desc: "Paid plans skip the queue for faster results." },
            { icon: ShieldCheck, title: "Credit-based", desc: "Pay only for what you generate. No surprises." },
          ].map((f) => {
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
      </section>


      <section className="mx-auto max-w-6xl px-4 pb-24 text-center">
        <div className="rounded-2xl border border-border bg-card p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to create?</h2>
          <p className="mt-2 text-muted-foreground">Start free, upgrade when you need video.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/pricing">Choose a plan</Link>
          </Button>
        </div>
      </section>
      <HomeTestimonials />
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
    <section className="mx-auto max-w-6xl px-4 py-16">
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
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Three studios, one workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pick a studio to jump straight into the right tools.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
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
  bg: string; // inline background CSS
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
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div
        className="glass-panel relative mx-auto overflow-hidden rounded-3xl p-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative h-64 sm:h-80">
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


type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

function SignedInHome() {
  const { user, profile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const [recent, setRecent] = useState<RecentGen[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("generations")
      .select("id, type, prompt, output_url, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setRecent(data as RecentGen[]);
      });
  }, [user]);

  const studios: { name: string; to: "/studio/image" | "/studio/video" | "/studio/music"; icon: typeof ImageIcon; gradient: string }[] = [
    { name: "Image Studio", to: "/studio/image", icon: ImageIcon, gradient: "gradient-image" },
    { name: "Video Studio", to: "/studio/video", icon: Video, gradient: "gradient-video" },
    { name: "Music Studio", to: "/studio/music", icon: Music, gradient: "gradient-music" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pt-10 pb-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick a studio and keep creating.</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Credits</div>
            <div className="text-2xl font-extrabold text-primary">
              {isAdmin ? "∞" : (profile?.credits ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {studios.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.name}
                to={s.to}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
              >
                <div className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full ${s.gradient} opacity-25 blur-2xl`} />
                <div className={`relative inline-flex rounded-xl ${s.gradient} p-2.5 text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="relative mt-4 text-lg font-bold">{s.name}</div>
                <div className="relative mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <HistoryIcon className="h-4 w-4" /> Recent history
            </h2>
            <Link to="/history" className="text-xs font-medium text-primary hover:underline">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No generations yet — pick a studio above to start.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {recent.map((g) => (
                <Link
                  key={g.id}
                  to="/history"
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
                >
                  {g.output_url && g.type !== "music" ? (
                    g.type === "video" ? (
                      <video src={g.output_url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={g.output_url} alt={g.prompt ?? ""} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}





