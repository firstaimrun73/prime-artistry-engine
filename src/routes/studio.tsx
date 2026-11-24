import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Image as ImageIcon, Video, Music, CircleDot, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AdsterraResponsive, DirectLinkAd, FreeStudioAdPrompt } from "@/components/ads";

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

type LauncherTool = {
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

  const tools: LauncherTool[] = [
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
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-[max(6.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pt-10">
        <div className="mb-10 text-center sm:mb-12 md:mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Motio2edit
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Studio
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Choose a tool to open
          </p>
        </div>

        <div
          className={cn(
            "grid w-full place-items-center",
            "grid-cols-2 gap-x-8 gap-y-10",
            "max-w-[22rem]",
            "sm:max-w-none sm:grid-cols-4 sm:gap-x-10 sm:gap-y-8",
            "md:gap-x-14",
            "lg:gap-x-16",
          )}
          role="list"
          aria-label="Studio tools"
        >
          {tools.map((tool, index) => (
            <ToolIcon key={tool.id} tool={tool} index={index} />
          ))}
        </div>

        <div className="mt-12 w-full max-w-lg">
          <AdsterraResponsive placement="studio-launcher" includeRect />
          <DirectLinkAd placement="studio-launcher" variant="compact" />
        </div>

        <style>{`
          @keyframes studioToolEnter {
            0% { opacity: 0; transform: scale(0.82) translateY(16px); }
            70% { opacity: 1; transform: scale(1.04) translateY(-2px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes studioToolIdle {
            0%, 100% { transform: translateY(0) scale(1); }
            40% { transform: translateY(-5px) scale(1.02); }
            60% { transform: translateY(-3px) scale(1.01); }
          }
          @keyframes studioToolGlow {
            0%, 100% { box-shadow: 0 8px 20px -6px color-mix(in oklab, var(--primary) 35%, transparent); }
            50% { box-shadow: 0 12px 28px -4px color-mix(in oklab, var(--primary) 55%, transparent); }
          }
          @media (prefers-reduced-motion: reduce) {
            .studio-tool-icon,
            .studio-tool-icon .studio-tool-face {
              animation: none !important;
            }
          }
        `}</style>
      </main>
      <FreeStudioAdPrompt />
    </div>
  );
}

function ToolIcon({ tool, index }: { tool: LauncherTool; index: number }) {
  const Icon = tool.icon;
  const enterDelay = index * 80;
  const idleDelay = index * 280;

  return (
    <Link
      to={tool.to}
      search={(tool.search ?? {}) as never}
      role="listitem"
      aria-label={tool.locked ? `${tool.title} — requires paid plan` : `Open ${tool.title}`}
      className={cn(
        "studio-tool-icon group relative flex flex-col items-center gap-3 outline-none",
        "transition-transform duration-200 ease-out will-change-transform",
        "hover:scale-[1.12] active:scale-[0.92]",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-3xl",
      )}
      style={{
        animation: `studioToolEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${enterDelay}ms both`,
      }}
    >
      <span
        className={cn(
          "studio-tool-face relative flex items-center justify-center",
          "h-[5.25rem] w-[5.25rem] rounded-[1.45rem]",
          "sm:h-[5.75rem] sm:w-[5.75rem] sm:rounded-[1.55rem]",
          "md:h-[6.25rem] md:w-[6.25rem] md:rounded-[1.65rem]",
          "bg-primary text-primary-foreground",
          "transition-[box-shadow,transform] duration-200 ease-out",
          "group-hover:shadow-[0_16px_36px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]",
          "group-active:shadow-md",
          "motion-safe:animate-[studioToolIdle_2.8s_ease-in-out_infinite,studioToolGlow_3.2s_ease-in-out_infinite]",
        )}
        style={{ animationDelay: `${idleDelay}ms, ${idleDelay}ms` }}
      >
        <Icon
          className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
          strokeWidth={1.7}
          aria-hidden
        />
        {tool.locked ? (
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-card text-primary shadow-sm">
            <Lock className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="max-w-[7.5rem] text-center text-[14px] font-semibold leading-tight text-foreground sm:max-w-none sm:text-[15px] md:text-base">
        {tool.title}
      </span>
    </Link>
  );
}
