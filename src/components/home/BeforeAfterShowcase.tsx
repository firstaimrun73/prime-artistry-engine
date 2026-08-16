import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MoveHorizontal, Sparkles } from "lucide-react";

import sampleObjectBefore from "@/assets/sample-object-before.jpg";
import sampleObjectAfter from "@/assets/sample-object-after.jpg";
import sampleRemovalBefore from "@/assets/sample-removal-before.jpg";
import sampleRemovalAfter from "@/assets/sample-removal-after.jpg";
import sampleRestoreBefore from "@/assets/sample-restore-before.jpg";
import sampleRestoreAfter from "@/assets/sample-restore-after.jpg";
import sampleUpscaleBefore from "@/assets/sample-upscale-before.jpg";
import sampleUpscaleAfter from "@/assets/sample-upscale-after.jpg";

type Sample = {
  label: string;
  title: string;
  before: string;
  after: string;
  prompt: string;
  smartRemove?: boolean;
};

/**
 * Real distinct before/after pairs under src/assets/ only.
 * object-contain keeps full subject (faces/heads) visible — no crop clipping.
 */
const SAMPLES: Sample[] = [
  {
    label: "Object Removal",
    title: "Remove distractions",
    before: sampleObjectBefore,
    after: sampleObjectAfter,
    prompt: "Remove the unwanted object completely and rebuild the background naturally",
  },
  {
    label: "Circle to Remove",
    title: "Erase a person or object",
    before: sampleRemovalBefore,
    after: sampleRemovalAfter,
    prompt: "Remove the circled person and rebuild the background naturally",
    smartRemove: true,
  },
  {
    label: "Photo Restoration",
    title: "Repair damaged photos",
    before: sampleRestoreBefore,
    after: sampleRestoreAfter,
    prompt: "Restore this old damaged photo and improve clarity while keeping content intact",
  },
  {
    label: "AI Upscaling",
    title: "Sharper detail",
    before: sampleUpscaleBefore,
    after: sampleUpscaleAfter,
    prompt: "Upscale this image with sharper detail while preserving identity and composition",
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
      {/* object-contain + centered so heads/faces are not clipped by cover crop */}
      <img
        src={sample.after}
        alt={`${sample.label} after`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img
          src={sample.before}
          alt={`${sample.label} before`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain object-center"
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
  const { user } = useAuth();

  const tryEdit = (sample: Sample) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({
          prompt: sample.prompt,
          mode: "image",
          smartRemove: !!sample.smartRemove,
        }),
      );
    } catch {
      /* ignore */
    }
    if (user) {
      navigate({ to: "/editor" });
    } else {
      navigate({ to: "/auth", search: { redirect: "/editor" } });
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Before &amp; After
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-3xl">Drag to see the difference</h2>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {SAMPLES.map((s, i) => (
          <article
            key={s.label}
            className="reveal-up flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-2xl"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <DragCompare sample={s} />
            <div className="min-w-0 flex-1 px-1 pt-3">
              <p className="truncate text-sm font-bold">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.title}</p>
            </div>
            <Button size="sm" className="btn-animate mt-3 w-full" onClick={() => tryEdit(s)}>
              Try this effect
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
