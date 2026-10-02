import { useRef, useState, useCallback, useEffect } from "react";

type Props = {
  before?: string;
  after?: string;
  /** @deprecated use before */
  beforeSrc?: string;
  /** @deprecated use after */
  afterSrc?: string;
  className?: string;
  /**
   * Slider handle + divider color.
   * Default: Filters orange #FF5A1F.
   * Remove BG: pass rose e.g. #f43f5e.
   */
  accentColor?: string;
  /** Show checkerboard behind after image (for transparent PNGs / keyed JPEGs). */
  transparentAfter?: boolean;
};

const DEFAULT_ACCENT = "#FF5A1F";

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
  backgroundColor: "#f8fafc",
} as const;

/**
 * Convert solid black (or near-black) demo backgrounds to transparent so the
 * checkerboard shows — matches true PNG cutouts (Rose).
 * Uses edge flood-fill so dark subject pixels (hair, car paint) stay opaque.
 */
function keyBlackBackgroundToTransparent(
  img: HTMLImageElement,
): string | null {
  try {
    const w = img.naturalWidth || 1;
    const h = img.naturalHeight || 1;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const n = w * h;
    const visited = new Uint8Array(n);

    const isBg = (i: number) => {
      const o = i * 4;
      const r = d[o]!;
      const g = d[o + 1]!;
      const b = d[o + 2]!;
      return r < 42 && g < 42 && b < 42;
    };

    const stack: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = y * w + x;
      if (visited[i]) return;
      if (!isBg(i)) return;
      visited[i] = 1;
      stack.push(i);
    };

    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }

    while (stack.length) {
      const i = stack.pop()!;
      d[i * 4 + 3] = 0;
      const x = i % w;
      const y = (i / w) | 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function useTransparentAfterUrl(afterUrl: string, enabled: boolean) {
  const [url, setUrl] = useState(afterUrl);

  useEffect(() => {
    if (!enabled || !afterUrl) {
      setUrl(afterUrl);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const keyed = keyBlackBackgroundToTransparent(img);
      setUrl(keyed || afterUrl);
    };
    img.onerror = () => {
      if (!cancelled) setUrl(afterUrl);
    };
    img.src = afterUrl;
    return () => {
      cancelled = true;
    };
  }, [afterUrl, enabled]);

  return url;
}

/**
 * BEFORE ← slider → AFTER in ONE shared frame.
 * Both images use identical inset geometry; only clip boundary moves.
 */
export function CompareSlider({
  before,
  after,
  beforeSrc,
  afterSrc,
  className,
  accentColor = DEFAULT_ACCENT,
  transparentAfter = false,
}: Props) {
  const beforeUrl = before || beforeSrc || "";
  const rawAfter = after || afterSrc || "";
  const afterUrl = useTransparentAfterUrl(rawAfter, transparentAfter);
  const [pos, setPos] = useState(50);
  const [ratio, setRatio] = useState<number | null>(null);
  const [frameW, setFrameW] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const src = beforeUrl || rawAfter;
    if (!src) {
      setRatio(1);
      return;
    }
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
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [beforeUrl, rawAfter]);

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
  const showBefore = pos > 14;
  const showAfter = pos < 86;
  const clipRight = Math.max(0, Math.min(100, 100 - pos));

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
          ...(transparentAfter ? CHECKER : {}),
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
          src={afterUrl}
          alt="After"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ objectFit: "contain", objectPosition: "center" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 ${clipRight}% 0 0)` }}
        >
          <img
            src={beforeUrl}
            alt="Before"
            draggable={false}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "contain", objectPosition: "center" }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2"
          style={{ left: `${pos}%`, backgroundColor: accentColor }}
        >
          <div
            className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden className="text-white">
              <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 1l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        {showBefore ? (
          <span className="pointer-events-none absolute left-2 top-2 z-[5] rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            BEFORE
          </span>
        ) : null}
        {showAfter ? (
          <span className="pointer-events-none absolute right-2 top-2 z-[5] rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            AFTER
          </span>
        ) : null}
      </div>
    </div>
  );
}
