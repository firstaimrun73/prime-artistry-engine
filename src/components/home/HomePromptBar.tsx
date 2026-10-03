/**
 * Homepage multi-reference prompt card.
 * One prompt → five reference frames.
 * Slots are 1:1 to match sample images so nothing is blank or letterboxed.
 */
import { Link } from "@tanstack/react-router";
import { WALKING_MAN_SAMPLES } from "@/lib/samples/walking-man";
import { ImagePlus, Mic, Send } from "lucide-react";

const EXAMPLE_PROMPT =
  "A man walking alone on an empty rural road at dusk. Keep his face, clothes and natural stride the same in every shot.";

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

      {/* Five equal 1:1 frames — images fill edge-to-edge, no blank bands */}
      <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
        {WALKING_MAN_SAMPLES.slice(0, 5).map((s, i) => (
          <div
            key={s.id}
            className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm dark:border-white/10"
          >
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
            <span className="absolute left-1 top-1 z-[1] rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[12px] font-medium leading-snug text-muted-foreground">
        One prompt · many photo types · Motion2AI turns them into coherent possibilities
      </p>
    </section>
  );
}
