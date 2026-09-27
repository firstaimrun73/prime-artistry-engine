/**
 * Homepage multi-reference prompt card.
 * One short humanatic line + 5 reference thumbnails.
 */
import {
  WALKING_MAN_SAMPLES,
} from "@/lib/samples/walking-man";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPT =
  "A man walking alone on an empty rural road at dusk. Keep his face, clothes and natural stride the same in every shot.";

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function HomePromptBar() {
  return (
    <section
      className="mt-10 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/70 sm:p-5"
      data-home-section="prompt-bar"
    >
      {/* Single humanatic prompt line */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-orange-500/25 dark:bg-orange-500/10">
        <p className="text-[13px] font-medium leading-snug text-foreground dark:text-white sm:text-sm">
          {EXAMPLE_PROMPT}
        </p>
      </div>

      {/* Exactly 5 reference thumbnails — fit in one row */}
      <div className={cn("mt-3.5 grid grid-cols-5 gap-2", SCROLL_HIDE)}>
        {WALKING_MAN_SAMPLES.slice(0, 5).map((s, i) => (
          <figure key={s.id} className="min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm dark:border-white/10">
              <img
                src={s.url}
                alt={s.alt}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              <span className="absolute left-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[8px] font-bold text-white">
                {i + 1}
              </span>
            </div>
          </figure>
        ))}
      </div>

      <p className="mt-3 text-center text-[12px] font-medium text-muted-foreground">
        One prompt · many references · Motion2AI studies them all and delivers one coherent result
      </p>
    </section>
  );
}
