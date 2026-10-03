/**
 * Homepage multi-reference prompt card.
 * One prompt → five larger reference frames in a vertical zigzag,
 * linked by a flowing dotted path animation.
 */
import { Link } from "@tanstack/react-router";
import { WALKING_MAN_SAMPLES } from "@/lib/samples/walking-man";
import { ImagePlus, Mic, Send } from "lucide-react";

const EXAMPLE_PROMPT =
  "A man walking alone on an empty rural road at dusk. Keep his face, clothes and natural stride the same in every shot.";

const REFS = WALKING_MAN_SAMPLES.slice(0, 5);

/** Left / right zigzag positions (percent of track width). */
const ZIG = [
  { x: 18, y: 0 },
  { x: 62, y: 1 },
  { x: 18, y: 2 },
  { x: 62, y: 3 },
  { x: 18, y: 4 },
] as const;

/** Card size in the track (px-ish via %). */
const CARD = 38; // % of container width

export function HomePromptBar() {
  return (
    <section
      className="mt-10 rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/80 sm:p-5"
      data-home-section="prompt-bar"
    >
      <Link
        to="/editor"
        search={{ prompt: EXAMPLE_PROMPT } as never}
        className="block rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2.5 shadow-inner transition hover:border-primary/30 dark:border-white/10">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground"
            aria-hidden
          >
            <ImagePlus className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1 py-1">
            <p className="text-[13px] font-medium leading-snug text-foreground sm:text-sm">
              {EXAMPLE_PROMPT}
            </p>
          </div>

          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground"
            aria-hidden
          >
            <Mic className="h-5 w-5" />
          </span>
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"
            aria-hidden
          >
            <Send className="h-4 w-4" />
          </span>
        </div>
      </Link>

      {/* Vertical zigzag track — larger cards, flowing dotted path */}
      <div
        className="relative mx-auto mt-5 w-full max-w-sm"
        style={{ aspectRatio: "1 / 2.15" }}
      >
        {/* Animated dotted path through centers */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 215"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={`M ${ZIG[0].x + CARD / 2} ${18 + CARD / 2}
                C ${50} ${18 + CARD / 2 + 8}, ${50} ${18 + 42 + CARD / 2 - 8}, ${ZIG[1].x + CARD / 2} ${18 + 42 + CARD / 2}
                C ${50} ${18 + 42 + CARD / 2 + 8}, ${50} ${18 + 84 + CARD / 2 - 8}, ${ZIG[2].x + CARD / 2} ${18 + 84 + CARD / 2}
                C ${50} ${18 + 84 + CARD / 2 + 8}, ${50} ${18 + 126 + CARD / 2 - 8}, ${ZIG[3].x + CARD / 2} ${18 + 126 + CARD / 2}
                C ${50} ${18 + 126 + CARD / 2 + 8}, ${50} ${18 + 168 + CARD / 2 - 8}, ${ZIG[4].x + CARD / 2} ${18 + 168 + CARD / 2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeDasharray="3.5 4.5"
            strokeLinecap="round"
            className="text-primary/55"
            style={{ animation: "ref-dash-flow 1.6s linear infinite" }}
          />
        </svg>

        {REFS.map((s, i) => {
          const pos = ZIG[i]!;
          const top = 18 + i * 42;
          return (
            <div
              key={s.id}
              className="absolute overflow-hidden rounded-2xl border-2 border-border/70 bg-muted shadow-md ring-1 ring-black/5 dark:border-white/15 dark:ring-white/5"
              style={{
                left: `${pos.x}%`,
                top: `${top}%`,
                width: `${CARD}%`,
                aspectRatio: "1 / 1",
              }}
            >
              <img
                src={s.url}
                alt={s.alt}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.35";
                }}
              />
              <span className="absolute left-1.5 top-1.5 z-[1] flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 px-1.5 text-[11px] font-bold leading-none text-white">
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[12px] font-medium leading-snug text-muted-foreground">
        One prompt · many photo types · Motion2AI turns them into coherent possibilities
      </p>

      <style>{`
        @keyframes ref-dash-flow {
          to { stroke-dashoffset: -16; }
        }
      `}</style>
    </section>
  );
}
