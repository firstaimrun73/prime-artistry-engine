import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MoveHorizontal, Sparkles } from "lucide-react";

type Sample = {
  label: string;
  title: string;
  before: string;
  after: string;
  prompt: string;
};

const SAMPLES: Sample[] = [
  {
    label: "Batman Bike Transformation",
    title: "Turn any bike into a Batman-style machine",
    before: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=700&h=700&fit=crop&q=85",
    after: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=700&h=700&fit=crop&q=85&sat=-100&con=40&exp=-15",
    prompt: "Make this bike look like the Batman bike, dark matte black armored styling, keep the exact same angle and proportions",
  },
  {
    label: "Object Removal",
    title: "Erase people and objects seamlessly",
    before: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&h=700&fit=crop&q=85",
    after: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&h=700&fit=crop&q=85",
    prompt: "Remove all people from the scene and rebuild the background naturally",
  },
  {
    label: "Background Removal",
    title: "Clean cut-outs with crisp edges",
    before: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=700&h=700&fit=crop&crop=faces&q=85",
    after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=700&h=700&fit=crop&crop=faces&q=85&sat=-100",
    prompt: "Remove the background completely and keep clean edges",
  },
  {
    label: "Face Enhancement",
    title: "Studio-grade portrait retouching",
    before: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&h=700&fit=crop&crop=faces&q=85",
    after: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=700&h=700&fit=crop&crop=faces&q=85",
    prompt: "Enhance the face, skin and lighting while keeping the identity identical",
  },
  {
    label: "Photo Restoration",
    title: "Repair and colorise old memories",
    before: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=700&fit=crop&crop=faces&q=85&sat=-80&con=-30",
    after: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=700&fit=crop&crop=faces&q=85",
    prompt: "Restore this old damaged photo and colorise it naturally",
  },
  {
    label: "AI Style Transfer",
    title: "Reimagine any shot as fine art",
    before: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=700&h=700&fit=crop&q=85",
    after: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=700&h=700&fit=crop&q=85",
    prompt: "Repaint this photo as a detailed oil painting while keeping the composition identical",
  },
];

function DragCompare({ sample }: { sample: Sample }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full select-none overflow-hidden rounded-xl border border-border bg-secondary"
      onMouseDown={(e) => {
        dragging.current = true;
        update(e.clientX);
      }}
      onMouseMove={(e) => dragging.current && update(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchStart={(e) => {
        dragging.current = true;
        update(e.touches[0].clientX);
      }}
      onTouchMove={(e) => dragging.current && update(e.touches[0].clientX)}
      onTouchEnd={() => (dragging.current = false)}
    >
      <img
        src={sample.after}
        alt={`${sample.label} after`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img
          src={sample.before}
          alt={`${sample.label} before`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
      <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
        Before
      </span>
      <span className="absolute right-2 top-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
        After
      </span>
      <div
        className="absolute inset-y-0 w-1 -translate-x-1/2 cursor-ew-resize bg-primary"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <MoveHorizontal className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export function BeforeAfterShowcase() {
  const navigate = useNavigate();

  const tryEdit = (prompt: string) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt, mode: "image" }));
    } catch {
      /* ignore */
    }
    navigate({ to: "/editor" });
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Before &amp; After
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-3xl">Drag to see the difference</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Real transformation styles you can run on your own photos in one click.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {SAMPLES.map((s, i) => (
          <article
            key={s.label}
            className="reveal-up flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-2xl"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <DragCompare sample={s} />
            <div className="min-w-0 flex-1 px-1 pt-3">
              <p className="truncate text-sm font-bold">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.title}</p>
            </div>
            <Button size="sm" className="btn-animate mt-3 w-full" onClick={() => tryEdit(s.prompt)}>
              Try this effect
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
