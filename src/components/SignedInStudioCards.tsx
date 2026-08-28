import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, Video, Music, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { useI18n } from "@/lib/i18n";

/**
 * Signed-in home: quick start + studios + capability discovery (grouped).
 */
export function SignedInStudioCards() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOpen = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOpen = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  type Card = {
    nameKey: string;
    to: "/studio/image" | "/studio/video" | "/studio/music" | "/pricing";
    icon: typeof ImageIcon;
    gradient: string;
    locked: boolean;
    lockLabel?: string;
    bulletKeys: string[];
  };

  const studios: Card[] = [
    {
      nameKey: "studio.image",
      to: "/studio/image",
      icon: ImageIcon,
      gradient: "gradient-image",
      locked: false,
      bulletKeys: ["feat.removeObject", "feat.enhance", "studio.openEditor"],
    },
    {
      nameKey: "studio.video",
      to: videoOpen ? "/studio/video" : "/pricing",
      icon: Video,
      gradient: "gradient-video",
      locked: !videoOpen,
      lockLabel: t("home.requiresLite"),
      bulletKeys: ["feat.video", "video.preset.textToVideo"],
    },
    {
      nameKey: "studio.music",
      to: musicOpen ? "/studio/music" : "/pricing",
      icon: Music,
      gradient: "gradient-music",
      locked: !musicOpen,
      lockLabel: t("home.requiresLite"),
      bulletKeys: ["feat.music", "music.mood"],
    },
  ];

  const quickActions: {
    to: "/editor" | "/studio/image" | "/studio/video" | "/music" | "/history";
    labelKey: string;
    descKey: string;
    primary?: boolean;
  }[] = [
    { to: "/editor", labelKey: "studio.openEditor", descKey: "studio.presetsHint", primary: true },
    { to: "/studio/image", labelKey: "studio.image", descKey: "feat.enhanceDesc" },
    { to: "/studio/video", labelKey: "home.createVideo", descKey: "feat.videoDesc" },
    { to: "/music", labelKey: "home.createMusic", descKey: "feat.musicDesc" },
    { to: "/history", labelKey: "home.viewHistory", descKey: "home.recentHistory" },
  ];

  const popular: { to: "/editor" | "/studio/image" | "/studio/image/circle-remove"; titleKey: string; descKey: string }[] = [
    { to: "/studio/image/circle-remove", titleKey: "feat.circleRemove", descKey: "feat.circleRemoveDesc" },
    { to: "/studio/image", titleKey: "feat.removeObject", descKey: "feat.removeObjectDesc" },
    { to: "/studio/image", titleKey: "feat.removeBg", descKey: "feat.removeBgDesc" },
    { to: "/studio/image", titleKey: "feat.replaceBg", descKey: "feat.replaceBgDesc" },
    { to: "/studio/image", titleKey: "feat.enhance", descKey: "feat.enhanceDesc" },
    { to: "/studio/image", titleKey: "feat.upscale", descKey: "feat.upscaleDesc" },
  ];

  const more: { to: "/editor" | "/studio/image" | "/studio/video" | "/music"; titleKey: string; descKey: string }[] = [
    { to: "/studio/image", titleKey: "feat.faceRestore", descKey: "feat.faceRestoreDesc" },
    { to: "/studio/image", titleKey: "feat.oldPhoto", descKey: "feat.oldPhotoDesc" },
    { to: "/studio/image", titleKey: "feat.colorize", descKey: "feat.colorizeDesc" },
    { to: "/studio/image", titleKey: "feat.clothing", descKey: "feat.clothingDesc" },
    { to: "/studio/image", titleKey: "feat.portrait", descKey: "feat.portraitDesc" },
    { to: "/studio/image", titleKey: "feat.headshot", descKey: "feat.headshotDesc" },
    { to: "/studio/image", titleKey: "feat.product", descKey: "feat.productDesc" },
    { to: "/studio/image", titleKey: "feat.interior", descKey: "feat.interiorDesc" },
    { to: "/studio/image", titleKey: "feat.style", descKey: "feat.styleDesc" },
    { to: "/editor", titleKey: "feat.textToImage", descKey: "feat.textToImageDesc" },
    { to: "/studio/video", titleKey: "feat.video", descKey: "feat.videoDesc" },
    { to: "/music", titleKey: "feat.music", descKey: "feat.musicDesc" },
  ];

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.quickStart")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.labelKey}
              to={a.to}
              className={
                "rounded-xl border px-3 py-3 transition-colors hover:border-primary/50 " +
                (a.primary
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground")
              }
            >
              <div className="text-sm font-semibold">{t(a.labelKey)}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{t(a.descKey)}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {studios.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.nameKey}
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
                      {t("home.locked")}
                    </span>
                  )}
                </div>
                <div className="mt-4 text-lg font-bold">{t(s.nameKey)}</div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {s.bulletKeys.map((k) => (
                    <li key={k}>• {t(k)}</li>
                  ))}
                </ul>
                {s.locked ? (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">{s.lockLabel}</p>
                    <div className="relative mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {t("home.upgradeUnlock")}{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </>
                ) : (
                  <div className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {t("studio.open")}{" "}
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
          {t("home.popularTools")}
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((c) => (
            <Link
              key={c.titleKey}
              to={c.to}
              className="rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
            >
              <div className="text-sm font-semibold">{t(c.titleKey)}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t(c.descKey)}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.moreTools")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {more.map((c) => (
            <Link
              key={c.titleKey}
              to={c.to}
              className="rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
            >
              <div className="text-sm font-semibold">{t(c.titleKey)}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{t(c.descKey)}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
