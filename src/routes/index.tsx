import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Music, Download, Zap, Wand2, ShieldCheck, Lock, ArrowRight, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicFeedback } from "@/lib/feedback.functions";
import { FeedbackCard } from "@/routes/feedback";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mot2Edit — AI Image, Video & Music Studio by Motion2AI" },
      { name: "description", content: "Mot2Edit, powered by Motion2AI. Upload, prompt, generate and download AI-powered images, videos and music in seconds." },
      { property: "og:title", content: "Mot2Edit — AI Image, Video & Music Studio by Motion2AI" },
      { property: "og:description", content: "Upload, prompt, generate and download AI-powered images, videos and music in seconds." },
    ],
  }),
  component: Index,
});

function Index() {
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
              <div className={`pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b ${c.accent} blur-2xl`} />
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

