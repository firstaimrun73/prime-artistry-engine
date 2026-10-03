/**
 * Homepage multi-reference prompt card.
 * Compact vertical zigzag of 5 refs + flowing orange dotted path.
 * Each card: full photo + "Image N" caption (no empty black bar).
 */
import { Link } from "@tanstack/react-router";
import { WALKING_MAN_SAMPLES } from "@/lib/samples/walking-man";
import { ImagePlus, Mic, Send } from "lucide-react";

const EXAMPLE_PROMPT =
  "A man walking alone on an empty rural road at dusk. Keep his face, clothes and natural stride the same in every shot.";

const REFS = WALKING_MAN_SAMPLES.slice(0, 5);

const CARD_W = 120;
const CARD_H = 138; // photo + caption
const STEP_PX = 148;
const TRACK_H = STEP_PX * (REFS.length - 1) + CARD_H;

export function HomePromptBar() {
  return (
    <section
      className="relative z-0 mt-10 overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/80 sm:p-5"
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

      <div
        className="relative mx-auto mt-4 w-full max-w-[320px] overflow-hidden"
        style={{ height: TRACK_H }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 320 ${TRACK_H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {REFS.slice(0, -1).map((_, i) => {
            const leftSide = i % 2 === 0;
            const x1 = leftSide ? 16 + CARD_W / 2 : 320 - 16 - CARD_W / 2;
            const x2 = leftSide ? 320 - 16 - CARD_W / 2 : 16 + CARD_W / 2;
            const y1 = i * STEP_PX + CARD_H / 2;
            const y2 = (i + 1) * STEP_PX + CARD_H / 2;
            const mx = 160;
            const my = (y1 + y2) / 2;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 7"
                strokeLinecap="round"
                className="text-orange-400/85"
                style={{ animation: "ref-dash-flow 1.4s linear infinite" }}
              />
            );
          })}
        </svg>

        {REFS.map((s, i) => {
          const leftSide = i % 2 === 0;
          const top = i * STEP_PX;
          return (
            <div
              key={s.id}
              className="absolute z-[1] flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md dark:border-white/15"
              style={{
                left: leftSide ? 16 : undefined,
                right: leftSide ? undefined : 16,
                top,
                width: CARD_W,
                height: CARD_H,
              }}
            >
              {/* Photo fills top — no black letterbox */}
              <div className="relative min-h-0 flex-1 overflow-hidden bg-muted">
                <img
                  src={s.url}
                  alt={s.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.35";
                  }}
                />
                <span className="absolute left-1.5 top-1.5 z-[1] flex h-5 min-w-5 items-center justify-center rounded-full bg-black/75 px-1.5 text-[11px] font-bold leading-none text-white">
                  {i + 1}
                </span>
              </div>
              {/* Caption instead of awkward black bar */}
              <div className="flex h-7 shrink-0 items-center justify-center border-t border-border/50 bg-background/95 px-2">
                <span className="text-[11px] font-semibold tracking-wide text-foreground">
                  Image {i + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[12px] font-medium leading-snug text-muted-foreground">
        One prompt · many photo types · Motion2AI turns them into coherent possibilities
      </p>

      <style>{`
        @keyframes ref-dash-flow {
          to { stroke-dashoffset: -26; }
        }
      `}</style>
    </section>
  );
}
