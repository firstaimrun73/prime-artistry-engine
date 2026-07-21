import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImageIcon, Video, Music, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — MOTIO2EDIT" },
      { name: "description", content: "Three dedicated AI creative workspaces: Image Studio, Video Studio, and Music Studio." },
      { property: "og:title", content: "Studio — MOTIO2EDIT" },
      { property: "og:description", content: "Three dedicated AI creative workspaces: Image Studio, Video Studio, and Music Studio." },
    ],
  }),
  component: StudioHub,
});

type Card = {
  name: string;
  desc: string;
  href: string;
  icon: typeof ImageIcon;
  accent: string;
  tools: string[];
  cta: string;
  disabled?: boolean;
};

const CARDS: Card[] = [
  {
    name: "Image Studio",
    desc: "Everything from remove-object and background-swap to upscaling, restoration, and AI generation.",
    href: "/studio/image",
    icon: ImageIcon,
    accent: "from-primary/25 to-primary/5",
    tools: ["Remove Object", "Circle to Remove", "Background Swap", "Upscale", "Restore", "Generate", "AI Headshot", "Colorize"],
    cta: "Open Image Studio",
  },
  {
    name: "Video Studio",
    desc: "Text-to-video, image-to-video, and cinematic AI video effects.",
    href: "/studio/video",
    icon: Video,
    accent: "from-red-500/25 to-red-500/5",
    tools: ["Text to Video", "Image to Video", "Slow Motion", "Cinematic FX", "Reels", "Shorts"],
    cta: "Open Video Studio",
  },
  {
    name: "Music Studio",
    desc: "AI-generated instrumental music from a prompt — pick genre, mood and duration.",
    href: "/studio/music",
    icon: Music,
    accent: "from-purple-500/25 to-purple-500/5",
    tools: ["Text to Music", "Cinematic", "Lo-fi", "EDM", "Ambient", "Synthwave"],
    cta: "Open Music Studio",
  },
];

function StudioHub() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Three dedicated workspaces
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Choose your <span className="text-primary">Studio</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Purpose-built AI workspaces for images, video, and music — each with its own tools and models.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <StudioCard key={c.name} card={c} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StudioCard({ card }: { card: Card }) {
  const Icon = card.icon;
  const navigate = useNavigate();

  const go = () => {
    if (card.disabled) return;
    navigate({ to: card.href });
  };

  const inner = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b ${card.accent} blur-2xl`} />
      <div className="relative flex items-center gap-3">
        <div className="rounded-xl border border-border bg-background/60 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold">{card.name}</h2>
      </div>
      <p className="relative mt-3 text-sm text-muted-foreground">{card.desc}</p>
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {card.tools.map((t) => (
          <button
            key={t}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              try {
                sessionStorage.setItem("prefill-prompt", toolToPrompt(card.name, t));
              } catch { /* ignore */ }
              navigate({ to: card.href });
            }}
            className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {card.cta}
        {!card.disabled && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </div>
    </div>
  );

  return (
    <button
      type="button"
      onClick={go}
      disabled={card.disabled}
      className={"block w-full text-left " + (card.disabled ? "cursor-not-allowed opacity-70" : "")}
    >
      {inner}
    </button>
  );
}

// Turn a tool chip into a starter prompt for the destination editor.
function toolToPrompt(studio: string, tool: string): string {
  if (studio === "Music Studio") {
    return `${tool} instrumental track, professional production, clean mix, high fidelity.`;
  }
  if (studio === "Video Studio") {
    return `${tool}: cinematic motion, smooth camera, natural lighting.`;
  }
  return `${tool}: apply this edit to the uploaded image while preserving identity and composition.`;
}
