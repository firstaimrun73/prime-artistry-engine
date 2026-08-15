import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Video, Film, Play, Zap, Sparkles, Camera, Wand2, Lock } from "lucide-react";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/studio/video")({
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      { name: "description", content: "Cinematic AI video generation: text-to-video, image-to-video, and modern motion presets." },
      { property: "og:title", content: "Video Studio — Motio2edit" },
      { property: "og:description", content: "Cinematic AI video generation: text-to-video, image-to-video, and modern motion presets." },
    ],
  }),
  component: VideoStudio,
});

type Preset = { nameKey: string; descKey: string; icon: typeof Video; prompt: string; needsImage: boolean };

function VideoStudio() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessVideo({ plan: profile?.plan, email: profile?.email, isAdmin: admin });

  const PRESETS: { labelKey: string; items: Preset[] }[] = [
    {
      labelKey: "video.preset.generate",
      items: [
        { nameKey: "video.preset.textToVideo", descKey: "video.preset.textToVideoDesc", icon: Sparkles, prompt: "", needsImage: false },
        { nameKey: "video.preset.imageToVideo", descKey: "video.preset.imageToVideoDesc", icon: Camera, prompt: "Bring this image to life with gentle cinematic motion.", needsImage: true },
      ],
    },
    {
      labelKey: "video.preset.cinematic",
      items: [
        { nameKey: "video.preset.slowPush", descKey: "video.preset.slowPushDesc", icon: Play, prompt: "Slow cinematic push-in toward the subject. Shallow depth of field. Natural motion.", needsImage: true },
        { nameKey: "video.preset.revealOrbit", descKey: "video.preset.revealOrbitDesc", icon: Film, prompt: "Smooth cinematic camera arc revealing the subject. Gentle parallax on background.", needsImage: true },
        { nameKey: "video.preset.dreamy", descKey: "video.preset.dreamyDesc", icon: Zap, prompt: "Dreamy slow-motion movement, soft lighting, elegant pacing.", needsImage: true },
        { nameKey: "video.preset.productSpin", descKey: "video.preset.productSpinDesc", icon: Wand2, prompt: "Product turntable rotation with clean studio lighting, subtle floor reflection.", needsImage: true },
      ],
    },
  ];

  useEffect(() => {
    if (user && profile && !allowed) {
      navigate({ to: "/pricing" });
    }
  }, [user, profile, allowed, navigate]);

  if (user && profile && !allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 pb-24 text-center md:pb-16">
          <Lock className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">{t("studio.videoLockedTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("studio.videoLockedBody")}</p>
          <Button asChild>
            <Link to="/pricing">{t("free.viewPlans")}</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const openBlank = () => {
    try {
      sessionStorage.setItem("motio2edit-mode", "video");
    } catch {
      /* ignore */
    }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  const applyPreset = (p: Preset) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({ prompt: p.prompt, mode: "video", ts: Date.now() }),
      );
    } catch {
      /* ignore */
    }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-24 md:pb-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/studio" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              {t("studio.allStudios")}
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              {t("studio.video").replace(" Studio", "")} <span className="text-primary">Studio</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("studio.videoLead")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openBlank}>{t("studio.openVideoEditor")}</Button>
          </div>
        </div>

        <div className="space-y-8">
          {PRESETS.map((cat) => (
            <section key={cat.labelKey}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t(cat.labelKey)}
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {cat.items.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.nameKey}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="rounded-lg border border-border bg-background/60 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-sm font-semibold">{t(p.nameKey)}</div>
                      <div className="text-xs text-muted-foreground">{t(p.descKey)}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
