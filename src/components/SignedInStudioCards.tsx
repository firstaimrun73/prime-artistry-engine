import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, Video, Music, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";

/**
 * Signed-in home studio cards — filtered by existing entitlements.
 * Free: Image only (no locked Video/Music placeholders).
 */
export function SignedInStudioCards() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const showVideo = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const showMusic = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  const studios: {
    name: string;
    to: "/studio/image" | "/studio/video" | "/studio/music";
    icon: typeof ImageIcon;
    gradient: string;
  }[] = [
    { name: "Image Studio", to: "/studio/image", icon: ImageIcon, gradient: "gradient-image" },
  ];
  if (showVideo) {
    studios.push({ name: "Video Studio", to: "/studio/video", icon: Video, gradient: "gradient-video" });
  }
  if (showMusic) {
    studios.push({ name: "Music Studio", to: "/studio/music", icon: Music, gradient: "gradient-music" });
  }

  const cols =
    studios.length === 1
      ? "md:grid-cols-1 max-w-sm"
      : studios.length === 2
        ? "md:grid-cols-2 max-w-2xl"
        : "md:grid-cols-3";

  return (
    <section className={`mt-8 grid gap-4 ${cols}`}>
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
  );
}
