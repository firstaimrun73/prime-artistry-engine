import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Image as ImageIcon, Video, Music, ArrowRight, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit by Motion2AI" },
      { name: "description", content: "Image, Video, and Music studios in one hub." },
      { property: "og:title", content: "Studio — Motio2edit by Motion2AI" },
    ],
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioHub />;
}

function StudioHub() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            Studio
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your creative studios
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Image for everyone. Video and Music unlock with a paid plan.
          </p>
        </div>

        {/* Image Studio — large hero */}
        <Link
          to="/studio/image"
          className="group relative mb-4 flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl border border-border bg-card p-6 transition-transform hover:scale-[1.01] sm:min-h-[240px] sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/5 to-transparent" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">Image Studio</h2>
              <p className="text-sm text-muted-foreground">Edit · restore · restyle</p>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            {["AI Edit", "Auto Edit", "Remove", "Enhance", "Multi-Image"].map((c) => (
              <span
                key={c}
                className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-semibold backdrop-blur"
              >
                {c}
              </span>
            ))}
          </div>
          <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
            Open Image Studio
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          to="/studio/image/auto-edit"
          className="mb-4 flex items-center gap-4 rounded-2xl border border-primary/35 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-[0_0_20px_hsl(24_95%_53%/0.4)]">
            A✦
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Auto Edit</p>
            <p className="text-xs text-muted-foreground">Upload a photo — AI does the rest</p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </Link>

        <div className="grid gap-4 sm:grid-cols-2">
          <LockedStudioCard
            title="Video Studio"
            tagline="Cinematic motion"
            icon={Video}
            bullets={["Image-to-video", "Camera moves", "Reels & shorts"]}
            locked={!videoOk}
            href={videoOk ? "/studio/video" : "/pricing"}
            gradient="from-red-500/25"
          />
          <LockedStudioCard
            title="Music Studio"
            tagline="Prompt-to-music"
            icon={Music}
            bullets={["Genre & mood", "Original tracks", "Up to 3-minute exports"]}
            locked={!musicOk}
            href={musicOk ? "/studio/music" : "/pricing"}
            gradient="from-fuchsia-500/25"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LockedStudioCard({
  title,
  tagline,
  icon: Icon,
  bullets,
  locked,
  href,
  gradient,
}: {
  title: string;
  tagline: string;
  icon: typeof Video;
  bullets: string[];
  locked: boolean;
  href: string;
  gradient: string;
}) {
  return (
    <Link
      to={href}
      className="group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-transform hover:scale-[1.01]"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} via-transparent to-transparent`} />
      <div className="relative flex items-center gap-3">
        <div className="rounded-xl border border-border bg-background/80 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>
      <ul className="relative mt-4 space-y-1.5 text-sm text-muted-foreground">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
            {b}
          </li>
        ))}
      </ul>
      <div className="relative mt-auto pt-5 text-sm font-semibold text-primary">
        {locked ? (
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Upgrade to unlock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            Open {title.replace(" Studio", "")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/55 backdrop-blur-[2px]">
          <div className="rounded-full border border-border bg-card p-3">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-semibold">🔒 {title}</p>
          <p className="text-xs text-muted-foreground">Upgrade to unlock</p>
        </div>
      )}
    </Link>
  );
}
