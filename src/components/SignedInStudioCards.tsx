import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, Video, Music, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";

/**
 * Signed-in home: quick start + studio cards + feature discovery.
 * Free: Image usable; Video + Music visible but locked (premium discovery).
 * Paid Lite+: all three open.
 */
export function SignedInStudioCards() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOpen = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOpen = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  type Card = {
    name: string;
    to: "/studio/image" | "/studio/video" | "/studio/music" | "/pricing";
    icon: typeof ImageIcon;
    gradient: string;
    locked: boolean;
    lockLabel?: string;
    bullets: string[];
  };

  const studios: Card[] = [
    {
      name: "Image Studio",
      to: "/studio/image",
      icon: ImageIcon,
      gradient: "gradient-image",
      locked: false,
      bullets: ["Remove objects & backgrounds", "Restore, upscale, retouch", "Open full Image Editor"],
    },
    {
      name: "Video Studio",
      to: videoOpen ? "/studio/video" : "/pricing",
      icon: Video,
      gradient: "gradient-video",
      locked: !videoOpen,
      lockLabel: "Requires Lite plan or higher",
      bullets: ["Text-to-video & image-to-video", "Cinematic camera presets", "Reels & shorts lengths"],
    },
    {
      name: "Music Studio",
      to: musicOpen ? "/studio/music" : "/pricing",
      icon: Music,
      gradient: "gradient-music",
      locked: !musicOpen,
      lockLabel: "Requires Lite plan or higher",
      bullets: ["Mood, genre & tempo", "15s–2 min tracks", "Download MP3"],
    },
  ];

  const quickActions: {
    to: "/editor" | "/studio/image" | "/history" | "/dashboard";
    label: string;
    desc: string;
    primary?: boolean;
  }[] = [
    { to: "/editor", label: "Open Image Editor", desc: "Full workspace", primary: true },
    { to: "/studio/image", label: "Image tools", desc: "Presets & shortcuts" },
    { to: "/history", label: "History", desc: "Recent projects" },
    { to: "/dashboard", label: "Profile", desc: "Plan & account" },
  ];

  const tools: {
    to: "/editor" | "/studio/image" | "/studio/video" | "/music";
    label: string;
    desc: string;
  }[] = [
    { to: "/editor", label: "Circle to Remove", desc: "Mark and erase objects" },
    { to: "/studio/image", label: "Background removal", desc: "Clean cut-outs" },
    { to: "/studio/image", label: "Image enhancement", desc: "Upscale & restore" },
    { to: "/studio/video", label: "Video creation", desc: "Text & image to video" },
    { to: "/music", label: "Music Studio", desc: "Mood & genre tracks" },
    { to: "/editor", label: "Generate from text", desc: "New image from prompt" },
  ];

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick start
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className={
                "rounded-xl border px-3 py-3 transition-colors hover:border-primary/50 " +
                (a.primary
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground")
              }
            >
              <div className="text-sm font-semibold">{a.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{a.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {studios.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.name}
              to={s.to}
              className={
                "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg" +
                (s.locked ? " ring-1 ring-primary/20" : "")
              }
            >
              <div
                className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full ${s.gradient} opacity-25 blur-2xl`}
              />
              {s.locked && (
                <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-background/40 backdrop-blur-[2px]" />
              )}
              <div className="relative z-20">
                <div className="flex items-start justify-between gap-2">
                  <div className={`inline-flex rounded-xl ${s.gradient} p-2.5 text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {s.locked && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
                <div className="mt-4 text-lg font-bold">{s.name}</div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {s.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
                {s.locked ? (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">{s.lockLabel}</p>
                    <div className="relative mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Upgrade to unlock{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </>
                ) : (
                  <div className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Open studio{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          What you can do
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              className="rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
            >
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
