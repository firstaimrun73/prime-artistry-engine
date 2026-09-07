/**
 * More Lenses - discovery for the camera Lens Editor.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { CAMERA_LENS_ROSTER } from "@/lib/lens-camera/roster";
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
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CAMERA_LENS_ROSTER;
    return CAMERA_LENS_ROSTER.filter(
      (l) =>
        l.name.toLowerCase().includes(needle) ||
        l.shortDescription.toLowerCase().includes(needle) ||
        l.concept.includes(needle),
    );
  }, [q]);

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
              {CAMERA_LENS_ROSTER.length} optical lenses · free on-device
            </p>
          </div>
        </div>

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

        <ul className="space-y-2">
          {list.map((l) => (
            <li key={l.id}>
              <Link
                to="/studio/image/lens-editor"
                search={{ lens: l.id }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40",
                  l.status !== "full" && "opacity-80",
                )}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {l.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={"truncate text-sm font-semibold"}>{l.name}</p>
                  <p className={"truncate text-xs text-muted-foreground"}>{l.shortDescription}</p>
                </div>
                {l.status === "full" ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Open
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Soon
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
