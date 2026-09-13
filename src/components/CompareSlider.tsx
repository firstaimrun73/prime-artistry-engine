import { useRef, useState, useCallback, useEffect } from "react";

type Props = {
  before: string;
  after: string;
  className?: string;
};

/**
 * BEFORE ← slider → AFTER.
 * Shared aspect-ratio frame constrained by available width AND height.
 * Divider + handle use Filters brand orange #FF5A1F.
 * Before and After share identical geometry for every aspect ratio.
 */
export function CompareSlider({ before, after, className }: Props) {
  const [pos, setPos] = useState(50);
  const [ratio, setRatio] = useState<number | null>(null);
  const [frameW, setFrameW] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      setRatio(w / h);
    };
    img.onerror = () => {
      if (!cancelled) setRatio(1);
    };
    img.src = after;
    return () => {
      cancelled = true;
    };
  }, [after]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer || ratio == null) return;

    const measure = () => {
      const ow = outer.clientWidth;
      const oh = outer.clientHeight;
      if (ow <= 0 || oh <= 0) return;
      let w = ow;
      let h = w / ratio;
      if (h > oh) {
        h = oh;
        w = h * ratio;
      }
      setFrameW(Math.round(w));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [ratio]);

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

  const frameH = ratio && frameW > 0 ? Math.round(frameW / ratio) : undefined;

  return (
    <div
      ref={outerRef}
      className={`flex h-full max-h-full w-full max-w-full items-center justify-center ${className ?? ""}`}
    >
      <div
        ref={ref}
        className="relative select-none overflow-hidden rounded-xl bg-black/5"
        style={{
          touchAction: "none",
          width: frameW > 0 ? frameW : "100%",
          height: frameH ?? "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: ratio ? String(ratio) : undefined,
        }}
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
        <img
          src={after}
          alt="After"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ objectFit: "fill" }}
        />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <img
            src={before}
            alt="Before"
            draggable={false}
            className="absolute left-0 top-0 h-full max-w-none"
            style={{
              width: frameW > 0 ? frameW : "100%",
              height: "100%",
              objectFit: "fill",
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-[#FF5A1F]"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#FF5A1F] shadow-md">
            <span className="text-[10px] font-bold text-white">‖</span>
          </div>
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          BEFORE
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          AFTER
        </span>
      </div>
    </div>
  );
}
