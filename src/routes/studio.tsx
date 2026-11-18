import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Image as ImageIcon, Video, Music, CircleDot, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Open Image, Circle 2edit, Video, or Music Studio in Motio2edit.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioLauncher />;
}

type LauncherApp = {
  id: string;
  title: string;
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  locked?: boolean;
};

function StudioLauncher() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  const apps: LauncherApp[] = [
    {
      id: "image",
      title: "Image",
      to: "/editor",
      icon: ImageIcon,
    },
    {
      id: "circle",
      title: "Circle 2edit",
      to: "/studio/image/circle-remove",
      search: { mode: "remove", from: "studio" },
      icon: CircleDot,
    },
    {
      id: "video",
      title: "Video",
      to: videoOk ? "/studio/video" : "/pricing",
      icon: Video,
      locked: !videoOk,
    },
    {
      id: "music",
      title: "Music",
      to: musicOk ? "/studio/music" : "/pricing",
      icon: Music,
      locked: !musicOk,
    },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-6 sm:px-6">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio2edit
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Studio
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose an app to open</p>
        </div>

        <div
          className={cn(
            "grid w-full max-w-md grid-cols-2 gap-x-6 gap-y-8 sm:max-w-none sm:grid-cols-4 sm:gap-x-8 sm:gap-y-6",
          )}
          role="list"
          aria-label="Studio apps"
        >
          {apps.map((app, index) => (
            <AppIcon key={app.id} app={app} delayMs={index * 60} />
          ))}
        </div>

        <style>{`
          @keyframes studioIconIdle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          @keyframes studioIconEnter {
            from { opacity: 0; transform: scale(0.92) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .studio-app-icon,
            .studio-app-icon .studio-icon-face {
              animation: none !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

function AppIcon({ app, delayMs }: { app: LauncherApp; delayMs: number }) {
  const Icon = app.icon;

  return (
    <Link
      to={app.to}
      search={(app.search ?? {}) as never}
      role="listitem"
      aria-label={app.locked ? `${app.title} — requires paid plan` : `Open ${app.title}`}
      className={cn(
        "studio-app-icon group relative flex flex-col items-center gap-2.5 outline-none",
        "transition-transform duration-200 ease-out",
        "hover:scale-110 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl",
      )}
      style={{
        animation: `studioIconEnter 0.35s ease-out ${delayMs}ms both`,
      }}
    >
      <span
        className={cn(
          "studio-icon-face relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] sm:h-[5rem] sm:w-[5rem] sm:rounded-[1.5rem]",
          "bg-primary text-primary-foreground",
          "shadow-md shadow-primary/25",
          "transition-[box-shadow,transform] duration-200 ease-out",
          "group-hover:shadow-lg group-hover:shadow-primary/40",
          "group-active:shadow-sm",
          "motion-safe:animate-[studioIconIdle_3.2s_ease-in-out_infinite]",
        )}
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.75} aria-hidden />
        {app.locked ? (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-card text-primary shadow-sm">
            <Lock className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="max-w-[6.5rem] text-center text-[13px] font-semibold leading-tight text-foreground sm:max-w-none sm:text-sm">
        {app.title}
      </span>
    </Link>
  );
}
