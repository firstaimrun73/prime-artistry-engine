import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Image as ImageIcon, Video, Music, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Editor Hub — MOTIO2EDIT by Motion2AI" },
      { name: "description", content: "Pick a studio: Image, Video, or Music. All Motion2AI editors in one hub." },
      { property: "og:title", content: "Editor Hub — MOTIO2EDIT by Motion2AI" },
      { property: "og:description", content: "Pick a studio: Image, Video, or Music. All Motion2AI editors in one hub." },
    ],
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Nested routes (/studio/image, /studio/video, /studio/music) render their own shells.
  if (pathname !== "/studio") return <Outlet />;
  return <StudioHub />;
}

type HubCard = {
  name: string;
  tagline: string;
  href: "/studio/image" | "/studio/video" | "/studio/music";
  icon: typeof ImageIcon;
  gradient: string;
  bullets: string[];
  freeAllowed: boolean;
};

const CARDS: HubCard[] = [
  {
    name: "Image Studio",
    tagline: "Edit, restore, restyle",
    href: "/studio/image",
    icon: ImageIcon,
    gradient: "gradient-image",
    bullets: ["Circle to Remove", "Upscale & restore", "Style transfer & headshots"],
    freeAllowed: true,
  },
  {
    name: "Video Studio",
    tagline: "Cinematic motion",
    href: "/studio/video",
    icon: Video,
    gradient: "gradient-video",
    bullets: ["Image-to-video", "Camera moves & presets", "Reels & shorts ready"],
    freeAllowed: false,
  },
  {
    name: "Music Studio",
    tagline: "Sunset aura sound",
    href: "/studio/music",
    icon: Music,
    gradient: "gradient-music",
    bullets: ["Prompt-to-music", "Genre & mood chips", "Up to 3-minute tracks"],
    freeAllowed: false,
  },
];

function StudioHub() {
  const { user, profile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const isPaid = isAdmin || (profile?.plan && profile.plan !== "free" && !!user);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            Editor Hub
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Three studios. One creative flow.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Pick a studio to jump straight into the right tools — each with its own visual identity.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => {
            const locked = !c.freeAllowed && !isPaid;
            const Icon = c.icon;
            const Card = (
              <div
                className="group glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${c.gradient} opacity-30 blur-3xl`} />
                <div className="relative flex items-center gap-3">
                  <div className={`rounded-xl ${c.gradient} p-2.5 text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.tagline}</p>
                  </div>
                </div>
                <ul className="relative mt-5 space-y-2 text-sm text-muted-foreground">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
              </div>
            );
            return locked ? (
              <Link key={c.name} to="/pricing" className="block h-full">
                {Card}
              </Link>
            ) : (
              <Link key={c.name} to={c.href} className="block h-full">
                {Card}
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
