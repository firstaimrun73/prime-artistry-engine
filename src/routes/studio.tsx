import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Image as ImageIcon, Video, Music, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit by Motion2AI" },
      { name: "description", content: "Image, Video, Music, and Circle 2edit studios in one hub." },
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

/** Studio hub = product selector: Image · Circle 2edit · Video · Music. */
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
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            Studio
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Choose a studio
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Image and Circle 2edit are free to start. Video and Music unlock on a paid plan.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/studio/image"
            className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl border border-border bg-card p-6 transition-transform hover:scale-[1.01] sm:min-h-[240px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/5 to-transparent" />
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
            <div className="relative">
              <div className="mb-4 inline-flex rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg">
                <ImageIcon className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-extrabold">Image Studio</h2>
              <p className="mt-1 text-sm text-muted-foreground">Generate · enhance · restyle</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/studio/image/circle-remove"
            className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl border border-[#2E3140] bg-[#181A22] p-6 transition-transform hover:scale-[1.01] sm:min-h-[240px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#A89BFF]/25 via-transparent to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#A89BFF]/20 blur-3xl" />
            <div className="relative">
              <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-[#A89BFF]/40 bg-[#22252F] p-3 shadow-lg">
                <span className="relative grid h-7 w-7 place-items-center">
                  <span className="absolute inset-0 rounded-full border-2 border-[#A89BFF]/80" />
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#F2F2F5]">
                <span className="text-[#A89BFF]">Circle</span>
                <span className="font-medium text-[#E8E9ED]"> 2edit</span>
              </h2>
              <p className="mt-1 text-sm text-[#9AA0B0]">Remove · Add · Crop</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#A89BFF]">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <LockedStudioCard
            title="Video Studio"
            tagline="Cinematic motion"
            icon={Video}
            locked={!videoOk}
            href={videoOk ? "/studio/video" : "/pricing"}
            gradient="from-red-500/30"
          />
          <LockedStudioCard
            title="Music Studio"
            tagline="Prompt-to-music"
            icon={Music}
            locked={!musicOk}
            href={musicOk ? "/studio/music" : "/pricing"}
            gradient="from-fuchsia-500/30"
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
  locked,
  href,
  gradient,
}: {
  title: string;
  tagline: string;
  icon: typeof Video;
  locked: boolean;
  href: string;
  gradient: string;
}) {
  return (
    <Link
      to={href}
      className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl border border-border bg-card p-6 transition-transform hover:scale-[1.01] sm:min-h-[240px]"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} via-transparent to-transparent`}
      />
      <div className="relative">
        <div className="mb-4 inline-flex rounded-2xl border border-border bg-background/80 p-3">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
          {locked ? (
            <>
              <Lock className="h-4 w-4" /> Upgrade to unlock
            </>
          ) : (
            <>
              Open
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </span>
      </div>
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl bg-background/55 backdrop-blur-[2px]">
          <div className="rounded-full border border-border bg-card p-3">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">Locked on Free</p>
        </div>
      )}
    </Link>
  );
}
