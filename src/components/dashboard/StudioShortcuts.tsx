import { Link } from "@tanstack/react-router";
import {
  Image as ImageIcon,
  Video,
  Music,
  Circle,
  Wand2,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, canAccessMalutoAI } from "@/lib/policy";

type Card = {
  title: string;
  description: string;
  to: string;
  icon: typeof ImageIcon;
  gradient: string;
  locked: boolean;
  lockHint?: string;
};

export function StudioShortcuts() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOpen = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOpen = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const malutoOpen = canAccessMalutoAI({ plan, email: profile?.email, isAdmin: admin });

  const cards: Card[] = [
    {
      title: "Image Studio",
      description: "Enhance, restore, remove objects, upscale & more",
      to: "/studio/image",
      icon: ImageIcon,
      gradient: "gradient-image",
      locked: false,
    },
    {
      title: "Video Studio",
      description: "Text-to-video and image-to-video creation",
      to: videoOpen ? "/studio/video" : "/pricing",
      icon: Video,
      gradient: "gradient-video",
      locked: !videoOpen,
      lockHint: "Requires a paid plan",
    },
    {
      title: "Music Studio",
      description: "Original tracks by mood, genre & style",
      to: musicOpen ? "/studio/music" : "/pricing",
      icon: Music,
      gradient: "gradient-music",
      locked: !musicOpen,
      lockHint: "Requires a paid plan",
    },
    {
      title: "Circle 2edit",
      description: "Mark anything and remove it cleanly",
      to: "/studio/image/circle-remove",
      icon: Circle,
      gradient: "gradient-image",
      locked: false,
    },
    {
      title: "Maluto AI",
      description: "Auto-edit and restore with one upload",
      to: malutoOpen ? "/studio/image/auto-edit" : "/pricing",
      icon: Wand2,
      gradient: "gradient-hero",
      locked: !malutoOpen,
      lockHint: "Requires a paid plan",
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Create with AI
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Jump into the tools you use most
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              to={c.to}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md " +
                (c.locked ? "ring-1 ring-primary/15" : "")
              }
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${c.gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
                aria-hidden
              />
              {c.locked && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-background/35 backdrop-blur-[1.5px]"
                  aria-hidden
                />
              )}
              <div className="relative z-20 flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`inline-flex rounded-xl ${c.gradient} p-2.5 text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {c.locked && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-bold">{c.title}</h3>
                <p className="mt-1 flex-1 text-xs leading-snug text-muted-foreground">
                  {c.description}
                </p>
                {c.locked ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Upgrade to unlock
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </p>
                ) : (
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </p>
                )}
                {c.locked && c.lockHint && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{c.lockHint}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
