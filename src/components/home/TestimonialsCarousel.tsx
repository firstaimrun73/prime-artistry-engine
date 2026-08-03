import { useEffect, useState } from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

type Testimonial = {
  name: string;
  role: string;
  flag: string;
  initials: string;
  text: string;
};

const TESTIMONIALS: Testimonial[] = [
  { name: "Aarav Mehta", role: "Content creator", flag: "🇮🇳", initials: "AM", text: "The object removal is unreal. I cleaned up a whole wedding shoot in an evening and clients could not tell anything was edited." },
  { name: "Sofia Rossi", role: "Product photographer", flag: "🇮🇹", initials: "SR", text: "Background removal keeps the edges perfectly crisp. It replaced two tools in my workflow and costs a fraction of them." },
  { name: "Daniel Okafor", role: "YouTube editor", flag: "🇳🇬", initials: "DO", text: "Image, video and music in one place is the killer part. I storyboard, render clips and score them without leaving the tab." },
  { name: "Emily Carter", role: "Marketing lead", flag: "🇺🇸", initials: "EC", text: "Our campaign visuals ship the same day now. The 4K export quality holds up on billboards, which genuinely surprised me." },
  { name: "Kenji Tanaka", role: "Indie game dev", flag: "🇯🇵", initials: "KT", text: "The music studio gives me loopable tracks that actually fit my scenes. Fast, cheap and no licensing headaches." },
  { name: "Lara Fernandes", role: "Photographer", flag: "🇧🇷", initials: "LF", text: "Photo restoration brought my grandmother's photos back to life. My family cried. That is the best review I can give." },
];

export function TestimonialsCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(id);
  }, [paused]);

  const step = (d: number) => setIdx((i) => (i + d + TESTIMONIALS.length) % TESTIMONIALS.length);
  const t = TESTIMONIALS[idx];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-3xl">Loved by creators worldwide</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Real workflows, real results — here is what people are making.
        </p>
      </div>

      <div
        className="relative mx-auto mt-6 max-w-3xl sm:mt-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <Quote className="h-7 w-7 text-primary" />
          <p className="mt-4 text-base leading-relaxed sm:text-lg">{t.text}</p>
          <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full gradient-hero text-sm font-bold text-white">
              {t.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {t.name} <span className="ml-1">{t.flag}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{t.role}</p>
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={() => step(-1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((x, i) => (
              <button
                key={x.name}
                type="button"
                aria-label={`Show review from ${x.name}`}
                onClick={() => setIdx(i)}
                className={"h-2 rounded-full transition-all " + (i === idx ? "w-6 bg-primary" : "w-2 bg-border")}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next testimonial"
            onClick={() => step(1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
