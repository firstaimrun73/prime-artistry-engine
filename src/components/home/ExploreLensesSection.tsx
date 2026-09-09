/**
 * Homepage — Explore AI Lenses (max 7 on home + more CTA).
 */
import { Link } from "@tanstack/react-router";
import { Aperture, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { getLensSampleCards, lensEditorHref } from "@/lib/lens-camera/lens-samples";
import { cn } from "@/lib/utils";

export function ExploreLensesSection() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);
  const allCards = getLensSampleCards();
  const cards = allCards.slice(0, 7);
  const moreCount = Math.max(0, allCards.length - cards.length);

  return (
    <section className="mt-12 space-y-4" data-home-section="explore-lenses">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight">
            <Aperture className="h-4 w-4 text-primary" />
            Explore AI Lenses
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Circular previews · pick a lens · upload your photo in the editor
          </p>
        </div>
        {paid ? (
          <Link to="/studio/image/lens-editor" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            Open Lens <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <Link to="/pricing" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
            Unlock <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {!paid && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">Lenses are on upgraded plans.</span>{" "}
          Preview the looks below, then upgrade to apply them to your photos.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="relative mx-auto aspect-square w-full max-w-[120px] overflow-hidden rounded-full border border-white/20 bg-black/40 shadow-md ring-1 ring-black/10">
                <img
                  src={c.imageUrl}
                  alt={`${c.name} — ${c.about}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                    console.warn("[lens-sample] failed", c.imageUrl);
                  }}
                />
                {!paid && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <Lock className="h-4 w-4 text-white" />
                  </span>
                )}
                {c.tier === "ai" && paid && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-1.5 text-[8px] font-bold text-white">
                    AI
                  </span>
                )}
              </div>
              <p className="mt-2 truncate text-center text-[11px] font-semibold leading-tight">{c.name}</p>
              <p className="truncate text-center text-[10px] text-muted-foreground">{c.about}</p>
            </>
          );

          if (!paid) {
            return (
              <Link key={c.id} to="/pricing" className={cn("rounded-2xl border border-border/70 bg-card/60 p-2.5 text-center transition hover:border-primary/35")}>
                {inner}
              </Link>
            );
          }

          return (
            <Link
              key={c.id}
              to="/studio/image/lens-editor"
              search={{ lens: c.lensId }}
              className={cn(
                "rounded-2xl border border-border/70 bg-card/60 p-2.5 text-center transition",
                "hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
              title={`Open ${c.name} — upload your image`}
            >
              {inner}
            </Link>
          );
        })}
      </div>

      {moreCount > 0 && (
        <Link
          to={paid ? "/studio/image/lenses" : "/pricing"}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 py-3 text-center text-[12px] font-semibold text-primary transition hover:border-primary/55 hover:bg-primary/10"
        >
          +{moreCount} more lenses made by Motion2AI
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Selecting a lens opens the camera editor. You always upload or capture your own photo.
        {paid ? "" : " · Upgrade to unlock application."}
      </p>
      <span className="sr-only">{lensEditorHref("lens_widevista")}</span>
    </section>
  );
}
