/**
 * Auto Edit–only Before/After compare.
 * Uses object-fit: contain so the full image is always visible (never cover/crop).
 * Container aspect ratio follows the AFTER image natural size.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  before: string;
  after: string;
  onOpenAfter?: () => void;
  className?: string;
};

export function AutoEditBeforeAfter({ before, after, onOpenAfter, className }: Props) {
  const [pos, setPos] = useState(50);
  const [ratio, setRatio] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = after;
  }, [after]);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, p)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (typeof clientX === "number") update(clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [update]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full select-none overflow-hidden rounded-2xl border border-violet-200/60 bg-slate-950/5 dark:border-violet-500/30 dark:bg-black/40",
        className,
      )}
      style={{
        aspectRatio: ratio ? String(ratio) : "4 / 3",
        maxHeight: "min(70vh, 720px)",
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-divider]")) {
          dragging.current = true;
          update(e.clientX);
        }
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest("[data-divider]")) {
          dragging.current = true;
          const x = e.touches[0]?.clientX;
          if (typeof x === "number") update(x);
        }
      }}
    >
      {/* AFTER (base) — full image, never cropped */}
      <img
        src={after}
        alt="After"
        draggable={false}
        onClick={() => onOpenAfter?.()}
        className="absolute inset-0 z-0 h-full w-full cursor-zoom-in object-contain object-center"
      />

      {/* BEFORE clipped by divider */}
      <div
        className="absolute inset-0 z-10 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={before}
          alt="Before"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
      </div>

      <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
        Before
      </span>
      <span className="pointer-events-none absolute right-2 top-2 z-20 rounded-full bg-violet-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
        After
      </span>

      {/* Draggable divider */}
      <div
        data-divider
        className="absolute inset-y-0 z-30 w-1 -translate-x-1/2 cursor-ew-resize bg-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)]"
        style={{ left: `${pos}%` }}
        role="slider"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Before after divider"
      >
        <span className="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white shadow-lg">
          ⇆
        </span>
      </div>
    </div>
  );
}
