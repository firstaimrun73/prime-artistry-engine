import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History as HistoryIcon,
  Music,
  Image as ImageIcon,
  Video,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import { getPlan, type PlanId } from "@/lib/plans";
import { canAccessMusic, canAccessVideo } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { IMAGE_SAMPLES } from "@/data/samples";
import { GALLERY_ITEMS } from "@/components/SampleGallery";
import sampleObjectAfter from "@/assets/sample-object-after.jpg";
import sampleRestoreAfter from "@/assets/sample-restore-after.jpg";
import sampleUpscaleAfter from "@/assets/sample-upscale-after.jpg";
import sampleRemovalAfter from "@/assets/sample-removal-after.jpg";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

type InspirationCard = {
  id: string;
  title: string;
  image: string;
  prompt: string;
  badge?: string;
  smartRemove?: boolean;
  toolId?: string;
};

/** Visual inspiration from local + gallery assets only (no scraped URLs). */
function buildInspiration(): InspirationCard[] {
  const fromSamples: InspirationCard[] = IMAGE_SAMPLES.map((s) => ({
    id: s.id,
    title: s.title,
    image: s.after || s.before || sampleObjectAfter,
    prompt: s.prompt,
    badge: s.category.replace(/-/g, " "),
    smartRemove: s.smartRemove,
  }));

  const fromGallery: InspirationCard[] = GALLERY_ITEMS.map((g, i) => ({
    id: `gal-${i}`,
    title: g.title,
    image: g.url,
    prompt: g.prompt,
    badge: g.category,
  }));

  const extras: InspirationCard[] = [
    {
      id: "x-restore",
      title: "Vintage restore",
      image: sampleRestoreAfter,
      prompt: "Restore this old photo: repair fade and damage, natural color",
      badge: "Restore",
    },
    {
      id: "x-upscale",
      title: "Crystal detail",
      image: sampleUpscaleAfter,
      prompt: "Upscale and recover fine detail while keeping the subject identical",
      badge: "Enhance",
    },
    {
      id: "x-remove",
      title: "Clean scene",
      image: sampleRemovalAfter,
      prompt: "Remove unwanted objects and rebuild the background naturally",
      badge: "Remove",
    },
    {
      id: "x-object",
      title: "Object erase",
      image: sampleObjectAfter,
      prompt: "Remove the unwanted object completely with matching lighting",
      badge: "Remove",
    },
  ];

  const seen = new Set<string>();
  const out: InspirationCard[] = [];
  for (const c of [...fromSamples, ...fromGallery, ...extras]) {
    if (seen.has(c.title)) continue;
    seen.add(c.title);
    out.push(c);
    if (out.length >= 20) break;
  }
  return out;
}

const INSPIRATION = buildInspiration();

export function SignedInHomeBody() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(profile?.email);
  const [recent, setRecent] = useState<RecentGen[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("generations")
      .select("id, type, prompt, output_url, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setRecent(data as RecentGen[]);
      });
  }, [user]);

  const planId = (profile?.plan ?? "free") as PlanId;
  const plan = getPlan(planId);
  const firstName = profile?.display_name ? profile.display_name.split(" ")[0] : "";
  const credits = isAdmin ? "∞" : (profile?.credits ?? 0).toLocaleString();
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });

  const tryCard = (c: InspirationCard) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({
          // Structured preset — editor applies as tool op, not forced visible text when possible
          prompt: c.prompt,
          mode: "image",
          smartRemove: !!c.smartRemove,
          toolId: c.toolId,
        }),
      );
      sessionStorage.setItem("motio2edit-mode", "image");
    } catch {
      /* ignore */
    }
    navigate({ to: "/editor" });
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-24 sm:pt-8 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.welcome")}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            What will you create?
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CrownBadge plan={planId} showLabel size="md" />
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {credits} credits
          </span>
        </div>
      </div>

      {/* Shortcut to dedicated Auto (bottom-nav product) — not a fourth Studio */}
      <Link
        to="/studio/image/auto-edit"
        className="mt-5 flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 transition-transform hover:scale-[1.01] sm:p-5"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-[0_0_24px_hsl(24_95%_53%/0.45)]">
          A✦
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold sm:text-lg">Auto Edit</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            One photo · no prompt · AI decides
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
      </Link>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Inspiration
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {INSPIRATION.map((c) => (
            <article
              key={c.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                <img
                  src={c.image}
                  alt={c.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {c.badge && (
                  <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur">
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <p className="truncate text-xs font-semibold">{c.title}</p>
                <button
                  type="button"
                  onClick={() => tryCard(c)}
                  className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Try this
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Exactly three studios */}
      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Studios</h2>

        <Link
          to="/studio/image"
          className="relative flex min-h-[120px] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-5 transition-transform hover:scale-[1.01]"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          <div className="relative flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <p className="text-lg font-bold">Image Studio</p>
          </div>
          <span className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <div className="grid gap-3 sm:grid-cols-2">
          <StudioMiniCard
            title="Video Studio"
            desc="Cinematic motion"
            icon={Video}
            locked={!videoOk}
            href={videoOk ? "/studio/video" : "/pricing"}
          />
          <StudioMiniCard
            title="Music Studio"
            desc="Tracks by mood"
            icon={Music}
            locked={!musicOk}
            href={musicOk ? "/studio/music" : "/pricing"}
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-3.5 w-3.5" /> Your recent
          </h2>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No creations yet</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/studio/image/auto-edit">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Auto Edit
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recent.map((g) => (
              <Link
                key={g.id}
                to="/history"
                className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
              >
                {g.output_url && g.type !== "music" ? (
                  g.type === "video" ? (
                    <video
                      src={g.output_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img src={g.output_url} alt="" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {planId !== "business" && (
        <p className="mt-10 text-center text-xs text-muted-foreground">
          On {plan.name} ·{" "}
          <Link to="/pricing" className="font-medium text-primary hover:underline">
            View plans
          </Link>
        </p>
      )}
    </main>
  );
}

function StudioMiniCard({
  title,
  desc,
  icon: Icon,
  locked,
  href,
}: {
  title: string;
  desc: string;
  icon: typeof Video;
  locked: boolean;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
        {locked && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <p className="mt-3 text-xs font-semibold text-primary">
        {locked ? "Upgrade to unlock" : "Open"}
      </p>
    </Link>
  );
}
