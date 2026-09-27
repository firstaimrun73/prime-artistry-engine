/**
 * Homepage multi-reference prompt card.
 * Looks like a real prompt bar: + icon, voice, send pointer.
 * Medium-size reference thumbnails that all fit.
 */
import {
  WALKING_MAN_SAMPLES,
} from "@/lib/samples/walking-man";
import { cn } from "@/lib/utils";
import { ImagePlus, Mic, Send } from "lucide-react";

const EXAMPLE_PROMPT =
  "A man walking alone on an empty rural road at dusk. Keep his face, clothes and natural stride the same in every shot.";

export function HomePromptBar() {
  return (
    <section
      className="mt-10 rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/80 sm:p-5"
      data-home-section="prompt-bar"
    >
      {/* Real prompt-bar look */}
      <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2.5 shadow-inner dark:border-white/10">
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Add reference"
        >
          <ImagePlus className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 py-1">
          <p className="text-[13px] font-medium leading-snug text-foreground sm:text-sm">
            {EXAMPLE_PROMPT}
          </p>
        </div>

        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Voice"
        >
          <Mic className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Medium reference thumbnails — all 5 visible */}
      <div className="mt-3.5 grid grid-cols-5 gap-2.5">
        {WALKING_MAN_SAMPLES.slice(0, 5).map((s, i) => (
          <figure key={s.id} className="min-w-0">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm dark:border-white/10">
              <img
                src={s.url}
                alt={s.alt}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              <span className="absolute left-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">
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
