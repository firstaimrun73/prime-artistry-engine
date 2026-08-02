import { useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, X, Columns2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  before: string;
  after: string;
};

type ViewMode = "side" | "slider";

/**
 * Side-by-side view: before and after live in their OWN containers, so the two
 * images can never overlap. Stacks on mobile, sits side-by-side on desktop.
 */
function SideBySide({ before, after, zoom }: Props & { zoom: number }) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
      {[
        { src: before, label: "Before" },
        { src: after, label: "After" },
      ].map((item) => (
        <div
          key={item.label}
          className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-card"
        >
          <img
            src={item.src}
            alt={item.label}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform"
            style={{ transform: `scale(${zoom})` }}
          />
          <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}


function Slider({ before, after, zoom }: Props & { zoom: number }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, p)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full select-none overflow-hidden rounded-xl border border-border bg-card"
      onMouseMove={(e) => dragging.current && update(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchMove={(e) => dragging.current && update(e.touches[0].clientX)}
      onTouchEnd={() => (dragging.current = false)}
    >
      {/* After is the base layer (z-0) */}
      <img
        src={after}
        alt="After"
        draggable={false}
        className="absolute inset-0 z-0 h-full w-full object-contain transition-transform"
        style={{ transform: `scale(${zoom})`, maxWidth: "100%" }}
      />
      {/* Before is clipped on top (z-10); dragging right reveals more Before, left reveals more After */}
      <div
        className="absolute inset-0 z-10"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={before}
          alt="Before"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain transition-transform"
          style={{ transform: `scale(${zoom})`, maxWidth: "100%" }}
        />
      </div>
      <span className="absolute left-2 top-2 z-20 rounded bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        Before
      </span>
      <span className="absolute right-2 top-2 z-20 rounded bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        After
      </span>
      <div
        className="absolute inset-y-0 z-30 w-1 -translate-x-1/2 cursor-ew-resize bg-primary"
        style={{ left: `${pos}%` }}
        onMouseDown={() => (dragging.current = true)}
        onTouchStart={() => (dragging.current = true)}
      >
        <span className="absolute top-1/2 left-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
          ⇆
        </span>
      </div>
    </div>
  );
}

function Controls({
  zoom,
  setZoom,
  mode,
  setMode,
  onFull,
}: {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  onFull?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button size="sm" variant={mode === "side" ? "default" : "outline"} onClick={() => setMode("side")}>
        <Columns2 className="mr-1.5 h-4 w-4" /> Side by side
      </Button>
      <Button size="sm" variant={mode === "slider" ? "default" : "outline"} onClick={() => setMode("slider")}>
        <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Slider
      </Button>
      <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="min-w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
      <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      {onFull && (
        <Button size="sm" variant="outline" onClick={onFull}>
          <Maximize2 className="mr-1.5 h-4 w-4" /> Fullscreen
        </Button>
      )}
    </div>
  );
}

export function CompareSlider({ before, after }: Props) {
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const [mode, setMode] = useState<ViewMode>("side");

  const View =
    mode === "slider" ? (
      <Slider before={before} after={after} zoom={zoom} />
    ) : (
      <SideBySide before={before} after={after} zoom={zoom} />
    );

  return (
    <>
      <div className="space-y-2">
        {View}
        <Controls zoom={zoom} setZoom={setZoom} mode={mode} setMode={setMode} onFull={() => setFull(true)} />
      </div>

      {full && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 p-4 backdrop-blur">
          <div className="flex justify-end">
            <Button size="icon" variant="ghost" onClick={() => setFull(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mx-auto flex w-full max-w-3xl flex-1 items-center">
            <div className="w-full">
              {View}
              <div className="mt-3">
                <Controls zoom={zoom} setZoom={setZoom} mode={mode} setMode={setMode} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
