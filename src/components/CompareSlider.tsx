import { useRef, useState, useCallback, useEffect } from "react";

type Props = {
  before: string;
  after: string;
  /** Optional className on the outer frame */
  className?: string;
};

/**
 * BEFORE ← slider → AFTER only.
 * Natural aspect ratio, object-fit contain, shared geometry.
 * Touch + mouse friendly vertical divider.
 */
export function CompareSlider({ before, after, className }: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, p)));
  }, []);

  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) update(e.clientX);
    };
    const onUp = () => endDrag();
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !e.touches[0]) return;
      e.preventDefault();
      update(e.touches[0].clientX);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, [update, endDrag]);

  return (
    <div
      ref={ref}
      className={`relative w-full select-none overflow-hidden rounded-xl bg-black/5 ${className ?? ""}`}
      style={{ touchAction: "none" }}
      onMouseDown={(e) => {
        dragging.current = true;
        update(e.clientX);
      }}
      onTouchStart={(e) => {
        if (!e.touches[0]) return;
        dragging.current = true;
        update(e.touches[0].clientX);
      }}
    >
      {/* Shared aspect box: after sets natural ratio via img layout */}
      <div className="relative w-full">
        <img
          src={after}
          alt="After"
          draggable={false}
          className="block h-auto w-full object-contain"
        />
        {/* Before clipped on top — same box, same contain fit */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <img
            src={before}
            alt="Before"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain object-center"
          />
        </div>

        <span className="pointer-events-none absolute left-2 top-2 z-20 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Before
        </span>
        <span className="pointer-events-none absolute right-2 top-2 z-20 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          After
        </span>

        {/* Divider */}
        <div
          className="absolute inset-y-0 z-30 w-0.5 -translate-x-1/2 cursor-ew-resize bg-[#7B6FE0]"
          style={{ left: `${pos}%` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            dragging.current = true;
            update(e.clientX);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (!e.touches[0]) return;
            dragging.current = true;
            update(e.touches[0].clientX);
          }}
        >
          <span className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#7B6FE0] text-sm font-semibold text-white shadow-lg">
            ⇆
          </span>
        </div>
      </div>
    </div>
  );
}
