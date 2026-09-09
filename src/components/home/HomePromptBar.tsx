/**
 * Homepage example — Motion2AI multi-reference demo (not a fillable form).
 * One technical prompt + five walking-man refs show how Motion2AI binds multiple images.
 */
import {
  WALKING_MAN_SAMPLES,
} from "@/lib/samples/walking-man";
import { cn } from "@/lib/utils";

/** Technical prompt derived from: walking man on a road, alone surroundings */
export const MOTION2AI_EXAMPLE_PROMPT =
  "Subject: solitary walking man on an empty rural road. Preserve identity, gait, and clothing across all reference frames. Environment: alone surroundings — open path, muted sky, distant hills, no crowd. Camera: natural lens, eye-level tracking, mild motion blur on limbs, locked horizon. Motion2AI: fuse multiple reference images into one coherent motion sequence; primary ref drives pose continuity, secondary refs guide style and wardrobe only.";

const SCROLL_HIDE =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function HomePromptBar() {
  return (
    <section
      className="mt-12 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-card/70 sm:p-6"
      data-home-section="prompt-bar"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <span className="text-sm font-black">✦</span>
        </span>
        <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
          Motion2AI · multi-reference example
        </h2>
      </div>

      <p className="mt-2 text-[12px] font-semibold leading-relaxed text-foreground/90 dark:text-white/85 sm:text-[13px]">
        One prompt can attach several photos. Ordinary multi-model stacks often fight each other —
        Motion2AI binds them as a single motion engine so identity, gait, and scene stay consistent.
      </p>

      <div
        className={cn(
          "mt-4 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3",
          "dark:border-orange-500/30 dark:bg-orange-500/10",
        )}
        role="note"
        aria-label="Example technical prompt"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary dark:text-orange-300">
          Example prompt (read-only)
        </p>
        <p className="mt-2 text-[13px] font-bold leading-snug text-foreground dark:text-white sm:text-sm">
          {MOTION2AI_EXAMPLE_PROMPT}
        </p>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Walking references · 5 frames · one engine
      </p>
      <div className={cn("mt-2 flex gap-3 overflow-x-auto pb-1", SCROLL_HIDE)}>
        {WALKING_MAN_SAMPLES.map((s, i) => (
          <figure
            key={s.id}
            className="w-[42%] max-w-[160px] shrink-0 sm:w-[28%] sm:max-w-[180px]"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-md dark:border-white/10">
              <img
                src={s.url}
                alt={s.alt}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  console.warn("[walking-man] failed", s.url);
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                Ref {i + 1}
              </span>
            </div>
            <figcaption className="mt-1.5 truncate text-center text-[11px] font-semibold text-foreground/80">
              {s.label}
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-3 text-[11px] font-medium leading-relaxed text-muted-foreground dark:text-white/50">
        Demo only — shows how Motion2AI can run one technical prompt across multiple stills.
        Open Image Studio or Lens from Quick create when you want to generate on your own photos.
      </p>
    </section>
  );
}
