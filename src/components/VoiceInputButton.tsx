// Small mic button that uses the browser's Web Speech API (free, no key).
// Falls back gracefully when the browser doesn't support it.
// While listening: restrained AI-assistant ring + waveform (respects reduced-motion).
// Listening UI stays inside the prompt composer (inline, no page-level overlay).
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
    <span className="relative inline-flex max-w-full items-center gap-1">
      {listening && (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none inline-flex max-w-[7rem] items-center gap-1 truncate rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px]"
        >
          {!reduceMotion && (
            <span className="flex shrink-0 items-end gap-0.5" aria-hidden>
              {[6, 10, 8, 12, 7].map((h, i) => (
                <span
                  key={i}
                  className="voice-wave-bar w-0.5 rounded-full bg-primary"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </span>
          )}
          <span className="truncate font-medium text-primary">Listening</span>
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        title={listening ? "Stop voice input" : "Speak your prompt"}
        className={
          "relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition " +
          (listening
            ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_0_3px_rgba(249,115,22,0.12)]"
            : "border-border bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/50") +
          (className ? ` ${className}` : "")
        }
      >
        {listening && !reduceMotion && (
          <>
            <span
              className="voice-mic-ring pointer-events-none absolute inset-[-4px] rounded-full border border-primary/50"
              aria-hidden
            />
            <span
              className="voice-mic-ring pointer-events-none absolute inset-[-8px] rounded-full border border-primary/25"
              style={{ animationDelay: "0.35s" }}
              aria-hidden
            />
          </>
        )}
        {listening ? <MicOff className="relative z-[1] h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
    </span>
  );
}
