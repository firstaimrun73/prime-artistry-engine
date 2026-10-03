/** Compact 5-ref strip — multi-photo from one prompt. No prompt bar, no Ace. */
import { WALKING_MAN_SAMPLES } from "@/lib/samples/walking-man";

const REFS = WALKING_MAN_SAMPLES.slice(0, 5);

export function WalkingRefsStrip() {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-4 dark:border-white/10" data-home-section="walking-refs">
      <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
        One prompt · many photo types · Motion2AI
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {REFS.map((s, i) => (
          <div key={s.id} className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted">
            <img src={s.url} alt={s.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
