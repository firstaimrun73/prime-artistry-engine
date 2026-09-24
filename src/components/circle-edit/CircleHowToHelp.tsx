/**
 * Circle 2edit — user-facing How to help modal.
 * Copy is product-provided; do not invent technical/backend details.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

export function CircleHowToHelp() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const body = isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="How to use Circle 2edit"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md text-[11px] font-bold",
          isDark ? "border-white/12 bg-white/8 text-[#9AA0B0]" : "border-black/8 bg-white/70 text-[#5C6170]",
        )}
      >
        ?
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-[60]" aria-label="Close" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "fixed inset-x-3 top-[max(3.5rem,env(safe-area-inset-top))] z-[70] max-h-[min(78dvh,34rem)] overflow-y-auto rounded-2xl border p-4 text-[12px] leading-relaxed shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:left-1/2 sm:w-[min(100%,26rem)] sm:-translate-x-1/2",
              isDark ? "border-white/12 bg-[#1A1C24]/97 text-[#F2F2F5]" : "border-black/8 bg-white/98 text-[#1A1C24]",
            )}
            role="dialog"
            aria-label="How to use Circle 2edit"
            data-circle-howto="true"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[14px] font-bold tracking-tight">How to use Circle2edit</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close help">
                <X className="h-4 w-4 opacity-60" />
              </button>
            </div>
            <div className="space-y-3">
              <section>
                <p className="font-semibold text-[#7B6FE0]">1. Upload your photo</p>
                <p className={body}>
                  Tap the upload area to choose a photo from your gallery. Any aspect ratio works — square, portrait, or
                  landscape.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">2. Choose Remove or Add</p>
                <p className={body}>
                  Remove — erase an object from your photo.
                  <br />
                  Add — place a new object into your photo.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">3. Mark the area</p>
                <p className={body}>
                  Circle tool — draw a rough closed loop around the object. Fast and good for well-defined shapes.
                  <br />
                  Brush tool — paint directly over the object for pixel-level precision. Use the size slider to adjust brush
                  thickness.
                  <br />
                  Eraser — corrects your marking without starting over.
                  <br />
                  Ink colors (purple/white/black) are just a visual guide so your marks show up clearly against the photo —
                  they don't change your photo's actual colors.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">4. Zoom in for detail work</p>
                <p className={body}>
                  Use the +/− buttons to zoom in on tricky areas like edges or hair, then drag to move around the zoomed
                  image and reach any part of the photo.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">5. Remove an object</p>
                <p className={body}>
                  Once you've marked it, tap Remove Object. The AI fills in the background naturally.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">6. Add an object</p>
                <p className={body}>
                  Tap Browse objects, pick one from the library, then mark where it should go on your photo, and tap Add
                  Object. The AI blends it in with matching lighting and perspective.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">Why do some objects cost credits?</p>
                <p className={body}>
                  Adding an object uses AI generation to realistically place and blend it into your photo — matching
                  lighting, shadow, and perspective takes more processing than a simple edit, so it uses credits. Check the
                  credit badge next to each object in the library for its exact cost before adding it.
                </p>
              </section>
              <section>
                <p className="font-semibold text-[#7B6FE0]">7. Review and save</p>
                <p className={body}>
                  On the results screen, compare your before and after. Free accounts get a watermark automatically; paid
                  accounts can toggle it off. Tap Download to save your photo.
                </p>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
