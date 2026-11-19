/**
 * Empty-state creative inspiration for Image Studio.
 * Rotates taglines until the user focuses/types in the prompt or adds references.
 * Black/bold, centered — not grey placeholder styling.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { pickStudioTagline } from "@/lib/studio/studio-taglines";

const INTERVAL_MS = 7000;
const FADE_MS = 420;

type Props = {
  /** When true, rotation is active; when false, component still can render nothing. */
  active: boolean;
  className?: string;
};

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

  if (!active) return null;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center px-4 py-3 text-center sm:px-6 sm:py-4",
        className,
      )}
      aria-live="polite"
    >
      <p
        className={cn(
          "max-w-lg text-base font-bold leading-snug tracking-tight text-foreground transition-opacity duration-300 sm:text-lg",
          "dark:text-foreground",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {line}
      </p>
    </div>
  );
}
