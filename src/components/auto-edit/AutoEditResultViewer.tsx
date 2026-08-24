/**
 * Auto Edit result lightbox — fit entire image to viewport (object-contain),
 * optional zoom + pan. Auto Edit violet theme.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  open: boolean;
  onClose: () => void;
  onDownload?: () => void;
  downloadBusy?: boolean;
};

export function AutoEditResultViewer({
  src,
  open,
  onClose,
  onDownload,
  downloadBusy,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-violet-950/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Auto Edit result viewer"
    >
      <div className="flex items-center justify-between gap-2 border-b border-violet-400/20 px-3 py-2 sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">
          Maluto AI · full image
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-violet-100">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {onDownload && (
            <Button
              size="sm"
              className="ml-1 bg-violet-600 hover:bg-violet-500"
              disabled={downloadBusy}
              onClick={onDownload}
            >
              {downloadBusy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Download
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4"
        onWheel={onWheel}
        onMouseDown={(e) => {
          if (zoom <= 1) return;
          dragging.current = true;
          last.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        }}
        onMouseMove={(e) => {
          if (!dragging.current) return;
          setOffset({
            x: e.clientX - last.current.x,
            y: e.clientY - last.current.y,
          });
        }}
        onMouseUp={() => {
          dragging.current = false;
        }}
        onMouseLeave={() => {
          dragging.current = false;
        }}
        onDoubleClick={() => {
          setZoom(1);
          setOffset({ x: 0, y: 0 });
        }}
      >
        {/* FIT TO VIEWPORT — never crop */}
        <img
          src={src}
          alt="Auto Edit result"
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? "grab" : "zoom-in",
          }}
          onClick={() => {
            if (zoom === 1) setZoom(2);
          }}
        />
      </div>

      <p className="pb-3 text-center text-[11px] text-violet-200/70">
        Pinch or scroll to zoom · drag when zoomed · double-tap to reset · Esc to close
      </p>
    </div>
  );
}
