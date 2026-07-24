// Small mic button that uses the browser's Web Speech API (free, no key).
// Falls back gracefully when the browser doesn't support it.
// While listening, shows a centered floating popup with animated sound waves.
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
          "grid h-8 w-8 place-items-center rounded-full border transition " +
          (listening
            ? "border-red-500 bg-red-500/10 text-red-500 animate-pulse"
            : "border-border bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/50") +
          (className ? ` ${className}` : "")
        }
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {listening && (
        <div
          role="dialog"
          aria-label="Listening for voice input"
          onClick={stopListening}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-[85%] max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            {/* Pulsing orange ring */}
            <div className="relative grid h-20 w-20 place-items-center">
              <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-orange-500/50 animate-pulse" />
              <div className="relative grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-lg">
                <Mic className="h-6 w-6" />
              </div>
            </div>

            {/* Sound wave bars */}
            <div className="flex items-end gap-1" aria-hidden>
              {[20, 35, 50, 35, 20].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-sm bg-orange-500"
                  style={{
                    height: `${h}px`,
                    animation: `voicewave 0.8s ease-in-out ${i * 0.1}s infinite`,
                  }}
                />
              ))}
            </div>

            <div className="text-center">
              <div className="text-base font-semibold">Listening... speak your prompt</div>
              <div className="mt-1 text-xs text-muted-foreground">Tap anywhere to cancel</div>
            </div>
            <style>{`@keyframes voicewave { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.3); } }`}</style>
          </div>
        </div>
      )}
    </>
  );
}
