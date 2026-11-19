/**
 * Empty-state creative inspiration for Image Studio.
 * Rotates taglines until the user focuses/types in the prompt or adds references.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { pickStudioTagline } from "@/lib/studio/studio-taglines";

const INTERVAL_MS = 6000;
const FADE_MS = 380;

type Props = {
  /** When true, rotation stops and the component renders nothing. */
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
        "flex min-h-[3.25rem] items-center justify-center px-3 py-2 text-center sm:min-h-[3.5rem]",
        className,
      )}
      aria-live="polite"
    >
      <p
        className={cn(
          "max-w-xl text-sm font-medium leading-snug tracking-tight text-muted-foreground transition-opacity duration-300 sm:text-base",
          "dark:text-muted-foreground/90",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {line}
      </p>
    </div>
  );
}
