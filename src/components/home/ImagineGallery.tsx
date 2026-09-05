/**
 * IMAGE gallery — Motion2AI Creation.
 * Large editorial cards. 95% media / 5% caption.
 * No Download/Share/Try Now on cards.
 * Media click → /sample/$id (no popup/sheet).
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { getImagineOnlySamples, type R2Sample } from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function aspectStyle(s: R2Sample): React.CSSProperties {
  if (s.width && s.height && s.width > 0 && s.height > 0) {
    return { aspectRatio: `${s.width} / ${s.height}` };
  }
  const map: Record<string, string> = {
    "16:9": "16 / 9",
    "21:9": "21 / 9",
    "9:16": "9 / 16",
    "1:1": "1 / 1",
    "3:4": "3 / 4",
    "4:5": "4 / 5",
    "2:3": "2 / 3",
    "3:2": "3 / 2",
    "4:3": "4 / 3",
    "11:15": "11 / 15",
  };
  return { aspectRatio: map[s.aspectRatio] ?? "4 / 5" };
}

function ImageCard({ sample, isDark }: { sample: R2Sample; isDark: boolean }) {
  const isWide =
    sample.aspectRatio === "16:9" ||
    sample.aspectRatio === "21:9" ||
    sample.aspectRatio === "3:2";

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-3xl",
        isDark ? "bg-white/[0.03]" : "bg-black/[0.03]",
        isWide && "sm:col-span-2",
      )}
    >
      <Link
        to="/sample/$id"
        params={{ id: sample.id }}
        className="relative block w-full overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        style={aspectStyle(sample)}
        aria-label={`Open ${sample.title}`}
      >
        <img
          src={sample.url}
          alt={sample.title}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span
          className={cn(
            "pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md",
            isDark
              ? "border-white/15 bg-black/40 text-white/90"
              : "border-white/60 bg-white/70 text-[#1A1C24]",
          )}
          aria-hidden
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      </Link>
      <div className="px-3 py-2">
        <h3 className="text-[12px] font-medium leading-tight tracking-tight line-clamp-1 text-foreground/90">
          {sample.title}
        </h3>
      </div>
    </article>
  );
}

export function ImagineGallery() {
  const samples = useMemo(() => {
    const seen = new Set<string>();
    return getImagineOnlySamples().filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }, []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-creation-section="image">
      <h3 className="text-[14px] font-bold tracking-tight">Image</h3>
      {/* Fewer columns = larger media. Mobile 2-col still readable; desktop max 3. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {samples.map((s) => (
          <ImageCard key={s.id} sample={s} isDark={isDark} />
        ))}
      </div>
    </section>
  );
}
