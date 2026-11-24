/**
 * Empty-state creative inspiration for Image Studio + UI-only Creative Strength slider.
 * Tagline rotates until user focuses/types or adds references.
 * Strength slider is always available (visual only — does not affect AI generation).
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { pickStudioTagline } from "@/lib/studio/studio-taglines";
import { CreativeStrengthSlider } from "@/components/editor/image/CreativeStrengthSlider";

const INTERVAL_MS = 7000;
const FADE_MS = 420;

type Props = { active: boolean; className?: string };

export function InspirationTagline({ active, className }: Props) {
  const [line, setLine] = useState(() => pickStudioTagline());
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setVisible(false);
      fadeTimer = setTimeout(() => {
        if (cancelled) return;
        setLine((prev) => pickStudioTagline(prev));
        setVisible(true);
      }, FADE_MS);
    }, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [active]);

  return (
    <div className={cn("w-full space-y-2 px-2 sm:px-4", className)}>
      {active && (
        <div
          className="flex w-full items-center justify-center py-2 text-center sm:py-3"
          aria-live="polite"
        >
          <p
            className={cn(
              "max-w-lg text-base font-bold leading-snug tracking-tight text-foreground transition-opacity duration-300 sm:text-lg",
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            {line}
          </p>
        </div>
      )}
      <CreativeStrengthSlider />
    </div>
  );
}
