import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
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
  badge: string;
  smartRemove?: boolean;
};

type InspirationCategory = {
  id: string;
  label: string;
  cards: InspirationCard[];
};

const U = {
  interior:
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
  mountain:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
  portrait:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  city: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80",
  fashion:
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
  vintage:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
  product:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
  nature:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
};

const CATEGORIES: InspirationCategory[] = [
  {
    id: "trending",
    label: "Trending tools",
    cards: [
      {
        id: "object-removal",
        title: "Clean living room",
        image: U.interior,
        badge: "Object Removal",
        prompt:
          "Clean scene, remove background clutter and stray objects from the floor layer, cinematic lighting.",
        smartRemove: true,
      },
      {
        id: "restore",
        title: "Vintage restore",
        image: sampleRestoreAfter || U.vintage,
        badge: "Photo Restoration",
        prompt:
          "Restore vintage photo, repair scratches, upscale details to 4k resolution, denoise film grain.",
      },
      {
        id: "upscale",
        title: "Crystal landscape",
        image: sampleUpscaleAfter || U.mountain,
        badge: "AI Upscaling",
        prompt:
          "Super-resolution, enhance texture details, ultra-sharp 8k landscape clarity, correct compression artifacts.",
      },
      {
        id: "face",
        title: "Portrait polish",
        image: U.portrait,
        badge: "Face Enhance",
        prompt:
          "Professional portrait enhancement, optimize lighting, balance face symmetry, soft studio background glow. Do not change identity.",
      },
      {
        id: "style",
        title: "Urban style transfer",
        image: U.city,
        badge: "Style Transfer",
        prompt:
          "Apply modern abstract expressionist style, vibrant color balancing, cinematic oil brush textures.",
      },
      {
        id: "bg-remove",
        title: "Studio cut-out",
        image: U.fashion,
        badge: "Background Removal",
        prompt:
          "Isolate main subject, completely remove background, generate clean transparent alpha mask layer.",
      },
    ],
  },
  {
    id: "effects",
    label: "Popular effects",
    cards: [
      {
        id: "hdr",
        title: "HDR nature",
        image: U.nature,
        badge: "HDR Enhance",
        prompt:
          "Apply cinematic HDR enhancement: richer contrast, balanced highlights and shadows, natural saturation.",
      },
      {
        id: "product",
        title: "Product shot",
        image: U.product,
        badge: "Product Photo",
        prompt:
          "Turn this into a clean e-commerce product shot on a pure white background with soft even lighting and a subtle floor shadow.",
      },
      {
        id: "erase",
        title: "Object erase",
        image: sampleObjectAfter,
        badge: "Magic Eraser",
        prompt:
          "Remove the unwanted object completely and reconstruct the background naturally with matching textures, lighting and perspective.",
        smartRemove: true,
      },
      {
        id: "scene-clean",
        title: "Scene cleanup",
        image: sampleRemovalAfter,
        badge: "Cleanup",
        prompt:
          "Remove small distractions and clutter from the image. Preserve the main subject and overall lighting.",
      },
      {
        id: "relight",
        title: "Studio relight",
        image: U.portrait,
        badge: "Relight",
        prompt:
          "Add professional studio lighting: soft key light from the front-left, gentle fill and rim light. Do not change identity.",
      },
      {
        id: "anime",
        title: "Anime look",
        image: U.city,
        badge: "Anime",
        prompt:
          "Convert this image into a modern anime illustration with expressive shading and clean cell style while preserving composition.",
      },
    ],
  },
  {
    id: "community",
    label: "Community work",
    cards: [
      {
        id: "c-restore",
        title: "Family archive",
        image: U.vintage,
        badge: "Restore",
        prompt:
          "Restore this old photograph. Remove scratches, dust, fading and noise. Keep the original composition and identity.",
      },
      {
        id: "c-mountain",
        title: "Peak clarity",
        image: U.mountain,
        badge: "Enhance",
        prompt:
          "Enhance this photo: increase sharpness, clarity and fine detail, reduce noise. Keep composition and colors identical.",
      },
      {
        id: "c-interior",
        title: "Room tidy",
        image: U.interior,
        badge: "Object Removal",
        prompt:
          "Remove clutter and unwanted objects from the room. Reconstruct surfaces with matching lighting and perspective.",
        smartRemove: true,
      },
      {
        id: "c-fashion",
        title: "Catalog cutout",
        image: U.fashion,
        badge: "Background Removal",
        prompt:
          "Remove the background entirely, keep only the main subject on a clean transparent background.",
      },
    ],
  },
];

export function SignedInHomeBody() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(profile?.email);
  const [recent, setRecent] = useState<RecentGen[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    setActiveId(c.id);
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({
          prompt: c.prompt,
          mode: "image",
          smartRemove: !!c.smartRemove,
          ts: Date.now(),
        }),
      );
      sessionStorage.setItem("motio2edit-mode", "image");
    } catch {
      /* ignore */
    }
    toast.success("Prompt loaded into workspace!", {
      description: c.badge,
      duration: 2200,
    });
    window.setTimeout(() => navigate({ to: "/editor" }), 280);
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
          <span className="rounded-full border border-border/80 bg-card/80 px-2.5 py-0.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
            {credits} credits
          </span>
        </div>
      </div>

      <Link
        to="/studio/image/auto-edit"
        className="group mt-5 flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-md transition-all duration-300 hover:scale-[1.015] hover:border-primary/70 hover:shadow-[0_8px_32px_hsl(24_95%_53%/0.25)] active:scale-[0.99] sm:p-5"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-[0_0_24px_hsl(24_95%_53%/0.45)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]">
          A✦
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold sm:text-lg">Auto Edit</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            One photo · no prompt · Motio2AI decides
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      <section className="mt-8 space-y-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Inspiration
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap a card to load an optimized prompt into the Image Editor
          </p>
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.label}
            </h3>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3 lg:grid-cols-4">
              {cat.cards.map((c) => (
                <InspirationTile
                  key={c.id}
                  card={c}
                  active={activeId === c.id}
                  onTry={() => tryCard(c)}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Studios</h2>

        <Link
          to="/studio/image"
          className="relative flex min-h-[128px] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-md transition-transform hover:scale-[1.01] hover:border-primary/40"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-transparent" />
          <div className="relative flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <p className="text-lg font-bold">Image Studio</p>
          </div>
          <p className="relative mt-1 text-xs text-muted-foreground">
            Edit, enhance, remove, restore
          </p>
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

      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-3.5 w-3.5" /> Your recent
          </h2>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
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
                className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-transform hover:scale-[1.03]"
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

function InspirationTile({
  card,
  active,
  onTry,
}: {
  card: InspirationCard;
  active: boolean;
  onTry: () => void;
}) {
  return (
    <article
      className={cn(
        "group relative w-[min(72vw,16rem)] shrink-0 snap-start overflow-hidden rounded-2xl border bg-card shadow-md transition-all duration-300 sm:w-auto",
        active
          ? "border-primary ring-2 ring-primary/60 shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/40 hover:shadow-lg",
      )}
    >
      <button type="button" className="block w-full text-left" onClick={onTry} aria-label={`Try ${card.title}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <img
            src={card.image}
            alt={card.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/20 bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-foreground shadow-sm backdrop-blur-md">
            {card.badge}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="truncate text-sm font-semibold">{card.title}</p>
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm transition-colors group-hover:bg-primary/90">
            Try this
          </span>
        </div>
      </button>
    </article>
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
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
        {locked && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur">
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
