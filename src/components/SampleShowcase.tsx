import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eraser, Film, Music, Pause, Play, Sparkles } from "lucide-react";
import { IMAGE_SAMPLES, VIDEO_SAMPLES, MUSIC_SAMPLES } from "@/data/samples";

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="waveform" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <span key={i} className={`wave-bar ${active ? "" : "wave-bar-paused"}`} />
      ))}
    </div>
  );
}

export function SampleShowcase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((next: number) => {
    setIndex((next + IMAGE_SAMPLES.length) % IMAGE_SAMPLES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % IMAGE_SAMPLES.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      audioRef.current?.pause();
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  }, []);

  const togglePlay = (url: string) => {
    if (playing === url) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(url);
    audio.onended = () => setPlaying(null);
    void audio.play().catch(() => setPlaying(null));
    audioRef.current = audio;
    setPlaying(url);
    stopTimer.current = setTimeout(stopAudio, 15000);
  };

  const goEditor = (payload: { prompt: string; mode: string; smartRemove?: boolean }) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    if (user) navigate({ to: "/editor" });
    else navigate({ to: "/auth", search: { redirect: "/editor" } });
  };

  const tryEdit = (sample: (typeof IMAGE_SAMPLES)[number]) => {
    goEditor({
      prompt: sample.prompt,
      mode: "image",
      smartRemove: !!sample.smartRemove,
    });
  };

  const tryVideo = (prompt: string) => {
    goEditor({ prompt, mode: "video" });
  };

  const tryMusic = (prompt: string) => {
    try {
      sessionStorage.setItem("prefill-prompt", prompt);
    } catch {
      /* ignore */
    }
    if (user) navigate({ to: "/music" });
    else navigate({ to: "/auth", search: { redirect: "/music" } });
  };

  const active = IMAGE_SAMPLES[index];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Real results
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-3xl">
          See what Motio<span className="text-primary">2</span>edit can do
        </h2>
      </div>

      <div
        className="mt-6 overflow-hidden rounded-3xl border border-border bg-card p-3 sm:mt-8 sm:p-6"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          setPaused(true);
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          setPaused(false);
          if (start == null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="relative">
          {IMAGE_SAMPLES.map((s, i) => (
            <div
              key={s.id}
              className={`transition-opacity duration-700 ${
                i === index ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
              }`}
              aria-hidden={i !== index}
            >
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {[
                  { src: s.before!, tag: "Before" },
                  { src: s.after!, tag: "After" },
                ].map((img) => (
                  <figure
                    key={img.tag}
                    className="relative overflow-hidden rounded-2xl border border-border bg-secondary"
                  >
                    <img
                      src={img.src}
                      alt={`${s.title} — ${img.tag}`}
                      loading="lazy"
                      width={500}
                      height={500}
                      className="protected-image aspect-square w-full object-contain object-center"
                      draggable={false}
                    />
                    <figcaption
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur ${
                        img.tag === "After"
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-background/80 text-muted-foreground"
                      }`}
                    >
                      {img.tag}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{active.title}</p>
            <h3 className="mt-1 break-words font-bold">{active.description}</h3>
          </div>
          <Button onClick={() => tryEdit(active)} className="btn-animate w-full shrink-0 sm:w-auto">
            {active.smartRemove ? (
              <>
                <Eraser className="mr-1.5 h-4 w-4" /> Try Circle Remove
              </>
            ) : (
              <>Try this edit</>
            )}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {IMAGE_SAMPLES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.title} example`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 sm:mt-12">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Video ideas</h3>
        </div>
        <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_SAMPLES.map((v) => (
            <div
              key={v.id}
              className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary"
            >
              <button
                type="button"
                onClick={() => tryVideo(v.prompt)}
                aria-label={`Generate a video like ${v.title}`}
                className="group relative block w-full"
              >
                <img
                  src={v.thumb}
                  alt={v.title}
                  loading="lazy"
                  width={1024}
                  height={576}
                  className="protected-image aspect-video w-full bg-secondary object-cover"
                  draggable={false}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-background/20 transition-colors group-hover:bg-background/40">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Play className="ml-0.5 h-5 w-5" />
                  </span>
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
                  {v.badge}
                </span>
                <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
                  {v.duration}
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <p className="truncate font-bold">{v.title}</p>
                <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{v.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-animate mt-3"
                  onClick={() => tryVideo(v.prompt)}
                >
                  Generate similar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 sm:mt-12">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Music ideas</h3>
        </div>
        <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MUSIC_SAMPLES.map((m) => {
            const isPlaying = playing === m.mediaUrl;
            return (
              <div
                key={m.id}
                className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>
                    🎵
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {m.duration}
                  </span>
                </div>
                <p className="mt-3 break-words font-bold">{m.title}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.genre} · {m.mood}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => m.mediaUrl && togglePlay(m.mediaUrl)}
                    aria-label={isPlaying ? `Pause ${m.title}` : `Play ${m.title} preview`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                  </button>
                  <Waveform active={!!isPlaying} />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="btn-animate mt-4"
                  onClick={() => tryMusic(m.prompt)}
                >
                  Generate similar
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
