// Small mic button that uses the browser's Web Speech API (free, no key).
// Falls back gracefully when the browser doesn't support it.
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

  function toggle() {
    if (disabled) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
      return;
    }
    const rec = new Ctor();
    // Use the browser's language so multilingual prompts work; the backend
    // enhance step translates non-English to English before generation.
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
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={listening ? "Stop voice input" : "Speak your prompt"}
      className={
        "grid h-8 w-8 place-items-center rounded-full border transition " +
        (listening
          ? "border-red-500 bg-red-500/10 text-red-500 animate-pulse"
          : "border-border bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/50") +
        (className ? ` ${className}` : "")
      }
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
