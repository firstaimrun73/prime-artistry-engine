import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X, ChevronLeft, ChevronRight, ZoomIn, Images, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import bgRemoval from "@/assets/samples/bg-removal.png.asset.json";
import objectRemoval from "@/assets/samples/object-removal.png.asset.json";
import photoRestoration from "@/assets/samples/photo-restoration.webp.asset.json";
import faceEnhance from "@/assets/samples/face-enhance.png.asset.json";
import aiUpscaling from "@/assets/samples/ai-upscaling.png.asset.json";
import styleTransfer from "@/assets/samples/style-transfer.png.asset.json";

type GalleryItem = {
  title: string;
  caption: string;
  url: string;
  beforeAfter?: boolean;
  category: string;
  time: string;
  prompt: string;
};

export const GALLERY_ITEMS: GalleryItem[] = [
  { title: "Background Removal", caption: "Clean cut-outs with crisp edges", url: bgRemoval.url, beforeAfter: true, category: "Image", time: "~8s", prompt: "Remove the background completely and keep clean edges" },
  { title: "Object Removal", caption: "Erase people and objects seamlessly", url: objectRemoval.url, beforeAfter: true, category: "Image", time: "~15s", prompt: "Remove all people from the scene and rebuild the background naturally" },
  { title: "Photo Restoration", caption: "Repair and colorise old memories", url: photoRestoration.url, beforeAfter: true, category: "Image", time: "~20s", prompt: "Restore this old damaged photo and colorise it naturally" },
  { title: "Face Enhancement", caption: "Studio-grade portrait retouching", url: faceEnhance.url, beforeAfter: true, category: "Portrait", time: "~12s", prompt: "Enhance the face, skin and lighting while keeping the identity identical" },
  { title: "AI Upscaling", caption: "Low-res to razor sharp 4K", url: aiUpscaling.url, beforeAfter: true, category: "Enhance", time: "~25s", prompt: "Upscale this image to 4K with maximum detail" },
  { title: "Style Transfer", caption: "Reimagine any shot as fine art", url: styleTransfer.url, beforeAfter: true, category: "Style", time: "~18s", prompt: "Repaint this photo as a detailed oil painting while keeping the composition identical" },
];


function Skeleton() {
  return <div className="absolute inset-0 animate-pulse bg-secondary" />;
}

export function SampleGallery() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const tryEffect = (prompt: string) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt, mode: "image" }));
    } catch {
      /* ignore */
    }
    navigate({ to: "/editor" });
  };


  const close = useCallback(() => {
    setOpenIndex(null);
    setZoomed(false);
  }, []);

  const step = useCallback((dir: number) => {
    setZoomed(false);
    setOpenIndex((i) => (i == null ? i : (i + dir + GALLERY_ITEMS.length) % GALLERY_ITEMS.length));
  }, []);

  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.modalOpen = "1";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      delete document.body.dataset.modalOpen;
    };
  }, [openIndex, close, step]);

  const active = openIndex == null ? null : GALLERY_ITEMS[openIndex];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Images className="h-3.5 w-3.5 text-primary" /> Sample Gallery
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-3xl">Real edits made with MOTIO2EDIT</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Tap any sample to view it fullscreen with zoom and navigation.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 items-stretch gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {GALLERY_ITEMS.map((item, i) => (
          <article
            key={item.title}
            className="reveal-up group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-2xl"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Open ${item.title} sample`}
              className="relative aspect-[3/2] w-full overflow-hidden bg-secondary"
            >
              {!loaded[i] && <Skeleton />}
              <img
                src={item.url}
                alt={`${item.title} before and after sample`}
                loading="lazy"
                decoding="async"
                draggable={false}
                onLoad={() => setLoaded((s) => ({ ...s, [i]: true }))}
                className={`protected-image absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  loaded[i] ? "opacity-100" : "opacity-0"
                }`}
              />
              {item.beforeAfter && (
                <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground backdrop-blur">
                  Before / After
                </span>
              )}
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-4 w-4 text-primary" />
              </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col p-4">
              <p className="truncate font-bold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.caption}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {item.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Clock className="h-3 w-3 text-primary" /> {item.time}
                </span>
              </div>
              <Button size="sm" className="btn-animate mt-4 w-full" onClick={() => tryEffect(item.prompt)}>
                Try This Effect
              </Button>
            </div>
          </article>
        ))}

      </div>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-3 backdrop-blur-md sm:p-6 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} fullscreen preview`}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close preview"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous sample"
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 transition-colors hover:border-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next sample"
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 transition-colors hover:border-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <figure className="max-h-full w-full max-w-5xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={active.url}
              alt={`${active.title} fullscreen sample`}
              onClick={() => setZoomed((z) => !z)}
              className={`mx-auto rounded-2xl border border-border transition-transform duration-500 ${
                zoomed ? "scale-150 cursor-zoom-out" : "max-h-[80vh] w-auto cursor-zoom-in"
              }`}
              draggable={false}
            />
            <figcaption className="mt-4 text-center text-sm font-semibold">
              {active.title}
              <span className="ml-2 font-normal text-muted-foreground">{active.caption}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
