/**
 * Signed-out homepage sample strip.
 * Uses ONLY Cloudflare account-2 files named pre-login* / pre_login*.
 * Card frame follows each sample's aspectRatio (9:16 stays portrait, 16:9 stays wide).
 */
import { Link } from "@tanstack/react-router";
import { getAccount2PreloginSamples } from "@/lib/r2-account2-samples";
import { cn } from "@/lib/utils";

function aspectClass(ar: string): string {
  const n = (ar || "16:9").replace(/\s/g, "");
  if (n === "9:16" || n === "3:4" || n === "2:3" || n === "4:5") return "aspect-[9/16]";
  if (n === "1:1") return "aspect-square";
  if (n === "4:3" || n === "3:2") return "aspect-[4/3]";
  // 16:9, 21:9, 16:10, default landscape
  return "aspect-video";
}

export function PreLoginSampleStrip() {
  const samples = getAccount2PreloginSamples();
  if (samples.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12" aria-label="Sample results">
      <div className="mb-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Real samples</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
          See what Motio<span className="text-primary">2</span>edit can do
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Real creative results from our tools. Sign in to open Image, Video, Music, Circle 2edit, and
          Maluto AI restore.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {samples.map((s) => {
          const portrait =
            s.aspectRatio === "9:16" ||
            s.aspectRatio === "3:4" ||
            s.aspectRatio === "2:3" ||
            s.aspectRatio === "4:5";
          return (
            <Link
              key={s.id}
              to="/auth"
              search={{ redirect: "/" }}
              className={cn(
                "group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md",
                portrait && "sm:max-w-xs sm:justify-self-center",
              )}
            >
              <div className={cn("relative overflow-hidden bg-secondary", aspectClass(s.aspectRatio))}>
                <img
                  src={s.url}
                  alt={s.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  draggable={false}
                />
              </div>
              <div className="p-3.5">
                <p className="text-sm font-bold leading-snug">{s.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                <span className="mt-2 inline-block text-xs font-semibold text-primary">
                  Sign in to try →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
