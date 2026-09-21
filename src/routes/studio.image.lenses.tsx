/**
 * More Lenses — circular R2 samples, deep-link to Lens Editor.
 * Free optical open for everyone (20 credits per Apply).
 * AI+ lenses require upgraded plan (or admin) — no per-Apply credit charge.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, Lock } from "lucide-react";
import { Header } from "@/components/Header";
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

  const freeCount = all.filter((l) => l.tier === "normal").length;
  const aiCount = all.filter((l) => l.tier === "ai").length;

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
              {freeCount} free optical · {aiCount} AI (plan access)
            </p>
          </div>
        </div>

        {!paid && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            AI+ lenses need a paid plan. Free optical lenses work for everyone (20 credits per Apply).{" "}
            <Link to="/pricing" className="font-semibold text-primary underline">
              Upgrade
            </Link>
          </div>
        )}

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lenses…"
            className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {list.map((l) => {
            const isAi = l.tier === "ai";
            const locked = isAi && !paid;
            const body = (
              <>
                <div className="relative mx-auto aspect-square w-full max-w-[7.5rem] overflow-hidden rounded-full border border-border bg-muted shadow-sm">
                  {l.imageUrl ? (
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
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ color: l.color }}>
                      {l.code}
                    </div>
                  )}
                  {locked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Lock className="h-4 w-4 text-white" />
                    </span>
                  )}
                  {!isAi && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold text-white">
                      Free
                    </span>
                  )}
                  {isAi && !locked && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-[8px] font-bold text-white">
                      AI+
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-center text-[11px] font-semibold">{l.name}</p>
                <p className="truncate text-center text-[10px] text-muted-foreground">{l.about}</p>
              </>
            );

            if (locked) {
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
          Tap a lens → camera opens. Capture or upload a photo, then shoot.
        </p>
      </main>
    </div>
  );
}
