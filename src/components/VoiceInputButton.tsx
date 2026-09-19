// Mic with flowing audio-wave while listening (respects reduced-motion).
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const WAVE_HEIGHTS = [4, 10, 6, 14, 8, 12, 5, 11, 7];

export function VoiceInputButton({
  onTranscript,
  disabled,
  className,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  function stopListening() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function toggle() {
    if (disabled) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      stopListening();
      return;
    }
    const rec = new Ctor();
    rec.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript);
    };
    rec.onerror = (e) => {
      if (e.error && e.error !== "aborted") {
        toast.error(`Voice input error: ${e.error}`);
      }
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  if (!supported) return null;

  return (
    <span className="relative inline-flex items-center justify-center">
      {/* Flowing wave bars around the mic while listening */}
      {listening && !reduceMotion && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center gap-[2px]"
          aria-hidden
        >
          {WAVE_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-orange-500/80"
              style={{
                height: `${h}px`,
                animation: `voice-wave 0.9s ease-in-out ${i * 0.07}s infinite alternate`,
              }}
            />
          ))}
        </span>
      )}

      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={listening ? "Stop listening" : "Start voice input"}
        title={listening ? "Stop" : "Speak your prompt"}
        className={cn(
          "relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full border transition",
          listening
            ? "border-orange-500/70 bg-orange-500/15 text-orange-600 shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
            : "border-border bg-background/70 text-muted-foreground hover:border-orange-400/50 hover:text-foreground",
          className,
        )}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      <style>{`
        @keyframes voice-wave {
          from { transform: scaleY(0.45); opacity: 0.55; }
          to { transform: scaleY(1.15); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
