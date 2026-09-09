/**
 * More Lenses — circular R2 samples, deep-link to Lens Editor (upload required there).
 * Back always → homepage (never Image Studio).
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, Lock } from "lucide-react";
import { Header } from "@/components/Header";
import { LENS_GENERATION_CREDITS } from "@/lib/lens-camera/roster";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/image/lenses")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "More Lenses — Motio2edit" },
      {
        name: "description",
        content: "Browse Motio2edit optical lenses and open them in the Lens Editor.",
      },
    ],
  }),
  component: MoreLensesPage,
});

function MoreLensesPage() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);
  const [q, setQ] = useState("");
  const all = useMemo(() => getLensSampleCards(), []);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (l) =>
        l.name.toLowerCase().includes(needle) ||
        l.about.toLowerCase().includes(needle) ||
        l.lensId.includes(needle),
    );
  }, [q, all]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/"
            className="grid h-9 w-9 place-items-center rounded-full border border-border"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">More Lenses</h1>
            <p className="text-xs text-muted-foreground">
              {all.length} lenses · AI {LENS_GENERATION_CREDITS} cr · free optical 0 cr
            </p>
          </div>
        </div>

        {!paid && (
          <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
            <Lock className="mr-1 inline h-3.5 w-3.5 text-primary" />
            Lenses are on upgraded plans. Preview below, then{" "}
            <Link to="/pricing" className="font-semibold text-primary underline">
              upgrade
            </Link>{" "}
            to apply on your photos.
          </div>
        )}

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lenses"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            aria-label="Search lenses"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {list.map((l) => {
            const body = (
              <>
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border border-border bg-muted shadow-sm">
                  <img
                    src={l.imageUrl}
                    alt={`${l.name} — ${l.about}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      console.warn("[more-lenses] failed", l.imageUrl);
                      (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                    }}
                  />
                  {!paid && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Lock className="h-4 w-4 text-white" />
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-center text-[11px] font-semibold">{l.name}</p>
                <p className="truncate text-center text-[10px] text-muted-foreground">{l.about}</p>
              </>
            );

            if (!paid) {
              return (
                <Link
                  key={l.id}
                  to="/pricing"
                  className="rounded-2xl border border-border bg-card p-2.5 text-center"
                >
                  {body}
                </Link>
              );
            }

            return (
              <Link
                key={l.id}
                to="/studio/image/lens-editor"
                search={{ lens: l.lensId }}
                className={cn(
                  "rounded-2xl border border-border bg-card p-2.5 text-center transition hover:border-primary/40",
                )}
              >
                {body}
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Selecting a lens opens the camera editor. Upload or capture your own photo before generating.
        </p>
      </main>
    </div>
  );
}
