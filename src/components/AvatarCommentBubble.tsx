import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import {
  AVATAR_COMMENTS,
  pickAvatarCommentIndex,
} from "@/lib/avatar-comments";
import { cn } from "@/lib/utils";

const MIN_INTERVAL_MS = 28_000;
const MAX_INTERVAL_MS = 38_000;
const VISIBLE_MS_MIN = 5_500;
const VISIBLE_MS_MAX = 7_500;
const RECENT_WINDOW = 20;

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Floating Motio AI character comments — local library, no network.
 * Bottom-right, dismissible, pauses when tab hidden / reduced motion.
 */
export function AvatarCommentBubble() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const recentRef = useRef<number[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showTimer.current) clearTimeout(showTimer.current);
    if (intervalTimer.current) clearTimeout(intervalTimer.current);
    hideTimer.current = null;
    showTimer.current = null;
    intervalTimer.current = null;
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const showNext = useCallback(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    const idx = pickAvatarCommentIndex(recentRef.current, AVATAR_COMMENTS.length, RECENT_WINDOW);
    recentRef.current = [...recentRef.current, idx].slice(-RECENT_WINDOW);
    setText(AVATAR_COMMENTS[idx]!);
    setVisible(true);
    const visibleFor = randBetween(VISIBLE_MS_MIN, VISIBLE_MS_MAX);
    hideTimer.current = setTimeout(() => setVisible(false), visibleFor);
  }, []);

  const schedule = useCallback(() => {
    if (intervalTimer.current) clearTimeout(intervalTimer.current);
    const delay = randBetween(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
    intervalTimer.current = setTimeout(() => {
      showNext();
      schedule();
    }, delay);
  }, [showNext]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      clearTimers();
      setVisible(false);
      return;
    }

    // First message after a gentle delay (not on every nav)
    showTimer.current = setTimeout(() => {
      showNext();
      schedule();
    }, randBetween(12_000, 20_000));

    const onVisibility = () => {
      if (document.hidden) {
        clearTimers();
        setVisible(false);
      } else if (!reducedMotion) {
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimers();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, clearTimers, schedule, showNext]);

  if (reducedMotion || !text) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[45] flex max-w-[min(18rem,calc(100vw-1.5rem))] items-end gap-2",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 sm:bottom-6 sm:right-6",
      )}
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto relative rounded-2xl border border-border/80 bg-card/95 px-3.5 py-2.5 text-left shadow-lg backdrop-blur-md transition-all duration-500",
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0 pointer-events-none",
        )}
        role="status"
      >
        <p className="pr-6 text-xs leading-relaxed text-foreground sm:text-[13px]">{text}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-primary/80">Motio</p>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {/* subtle float when visible */}
        <style>{`
          @keyframes avatarBubbleFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
        `}</style>
        {visible && (
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl motion-safe:animate-[avatarBubbleFloat_3.5s_ease-in-out_infinite]"
            aria-hidden
          />
        )}
      </div>
      <div
        className={cn(
          "pointer-events-none hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-card shadow-md sm:flex",
          visible ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <BrandMark />
      </div>
    </div>
  );
}
