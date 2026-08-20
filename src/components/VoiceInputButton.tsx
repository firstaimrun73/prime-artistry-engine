// Small mic button that uses the browser's Web Speech API (free, no key).
// Falls back gracefully when the browser doesn't support it.
// While listening: restrained AI-assistant ring + waveform (respects reduced-motion).
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

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
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        title={listening ? "Stop voice input" : "Speak your prompt"}
        className={
          "relative grid h-9 w-9 place-items-center rounded-full border transition " +
          (listening
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/50") +
          (className ? ` ${className}` : "")
        }
      >
        {listening && !reduceMotion && (
          <span
            className="voice-mic-ring pointer-events-none absolute inset-[-3px] rounded-full border border-primary/40"
            aria-hidden
          />
        )}
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {listening && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute right-0 top-full z-20 mt-2 flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs shadow-md backdrop-blur-sm"
        >
          {!reduceMotion && (
            <div className="flex items-end gap-0.5" aria-hidden>
              {[10, 16, 12, 18, 11].map((h, i) => (
                <span
                  key={i}
                  className="voice-wave-bar w-0.5 rounded-full bg-primary"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
          )}
          <span className="font-medium text-foreground">Listening…</span>
        </div>
      )}
    </>
  );
}
