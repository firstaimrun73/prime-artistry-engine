/**
 * Homepage multi-reference prompt card.
 * Simple concept only: one prompt + multiple reference images.
 * NOT a Studio explainer.
 */
import {
  WALKING_MAN_SAMPLES,
} from "@/lib/samples/walking-man";
import { cn } from "@/lib/utils";

/** Short, human 3-line example prompt */
const EXAMPLE_PROMPT = `A man walking alone on an empty rural road at dusk.
Keep his face, clothes, and natural stride consistent.
Use all the reference photos for identity and style.`;

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function HomePromptBar() {
  return (
    <section
      className="mt-12 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/70 sm:p-6"
      data-home-section="prompt-bar"
    >
      {/* Prompt bar */}
      <div
        className={cn(
          "rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5",
          "dark:border-orange-500/30 dark:bg-orange-500/10",
        )}
      >
        <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-foreground dark:text-white sm:text-sm">
          {EXAMPLE_PROMPT}
        </p>
      </div>

      {/* 5 reference thumbnails */}
      <div className={cn("mt-4 flex gap-2.5 overflow-x-auto pb-1 sm:gap-3", SCROLL_HIDE)}>
        {WALKING_MAN_SAMPLES.slice(0, 5).map((s, i) => (
          <figure
            key={s.id}
            className="w-[18%] min-w-[64px] max-w-[100px] shrink-0 sm:min-w-[80px]"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border/80 bg-muted shadow-sm dark:border-white/10">
              <img
                src={s.url}
                alt={s.alt}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              <span className="absolute left-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm">
                {i + 1}
              </span>
            </div>
          </figure>
        ))}
      </div>

      {/* One-line caption */}
      <p className="mt-3 text-center text-[12px] font-medium text-muted-foreground">
        One prompt, multiple reference images
      </p>
    </section>
  );
}
