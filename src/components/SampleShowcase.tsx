import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eraser, Film, Music, Pause, Play, Sparkles } from "lucide-react";

type ImageSample = {
  label: string;
  title: string;
  before: string;
  after: string;
  prompt: string;
  smartRemove?: boolean;
};

const IMAGE_SAMPLES: ImageSample[] = [
  {
    label: "Background Removal",
    title: "Remove the background completely",
    before:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&h=500&fit=crop&crop=faces&q=90",
    after:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&h=500&fit=crop&crop=faces&q=90&sat=-100",
    prompt: "Remove the background completely",
  },
  {
    label: "Photo Restoration",
    title: "Restore and enhance this old photo",
    before:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop&crop=faces&q=90&sat=-80&con=-30",
    after:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop&crop=faces&q=90",
    prompt: "Restore and enhance this old photo",
  },
  {
    label: "Object Removal",
    title: "Remove all people from the scene",
    before: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop&q=90",
    after: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=500&fit=crop&q=90",
    prompt: "Remove all people from the scene",
  },
  {
    label: "4K AI Enhancement",
    title: "Enhance to 4K quality",
    before: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces&q=10",
    after: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop&crop=faces&q=100",
    prompt: "Enhance to 4K quality",
  },
  {
    label: "Artistic Style",
    title: "Make this look like oil painting",
    before: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=500&h=500&fit=crop&q=90",
    after: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=500&h=500&fit=crop&q=90",
    prompt: "Make this look like oil painting",
  },
  {
    label: "Portrait Enhancement",
    title: "Enhance face and lighting",
    before:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop&crop=faces&q=90",
    after:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop&crop=faces&q=90",
    prompt: "Enhance face and lighting",
  },
  {
    label: "Circle & Remove",
    title: "Draw a circle over any person or object to remove it instantly",
    before:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=500&fit=crop&crop=faces&q=90",
    after: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=500&h=500&fit=crop&q=90",
    prompt: "Remove the circled person and rebuild the background naturally",
    smartRemove: true,
  },
];

const VIDEO_SAMPLES = [
  {
    title: "Cinematic Landscape",
    badge: "Text to Video",
    thumb: "https://images.unsplash.com/photo-1536240478700-b869ad10e2ab?w=500&h=500&fit=crop&q=90",
    prompt:
      "A cinematic drone shot flying over misty mountains at golden hour with dramatic lighting",
  },
  {
    title: "Tech Visualization",
    badge: "Text to Video",
    thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=500&fit=crop&q=90",
    prompt:
      "Futuristic AI robot assembling itself from particles of light in a dark laboratory with blue glow",
  },
  {
    title: "Fitness Motivation",
    badge: "Image to Video",
    thumb: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=500&fit=crop&q=90",
    prompt:
      "Athletic person running through city streets at sunset with motion blur and cinematic color grading",
  },
];

const MUSIC_SAMPLES = [
  {
    title: "Epic Cinematic Trailer",
    genre: "Orchestral",
    mood: "Epic",
    duration: "30s",
    icons: "🎻 🥁",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    prompt:
      "Epic cinematic trailer track with soaring strings, deep taiko drums and a triumphant brass finale.",
  },
  {
    title: "Lo-fi Study Beats",
    genre: "Lo-fi",
    mood: "Chill",
    duration: "30s",
    icons: "🎹 🎸",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    prompt:
      "Warm lofi hip hop beat with dusty vinyl crackle, mellow Rhodes piano chords and a laid-back bassline.",
  },
  {
    title: "Electronic Dance",
    genre: "Electronic",
    mood: "Energetic",
    duration: "30s",
    icons: "🎛️ 🎧",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    prompt:
      "High-energy electronic dance track with pulsing synth bass, bright arpeggios and a euphoric drop.",
  },
];

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
    // 15 second preview only
    stopTimer.current = setTimeout(stopAudio, 15000);
  };

  const tryEdit = (sample: { prompt: string; smartRemove?: boolean }) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({ prompt: sample.prompt, mode: "image", smartRemove: !!sample.smartRemove }),
      );
    } catch {
      /* ignore */
    }
    navigate({ to: "/editor" });
  };

  const tryVideo = (prompt: string) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt, mode: "video" }));
    } catch {
      /* ignore */
    }
    navigate({ to: "/editor" });
  };

  const tryMusic = (prompt: string) => {
    try {
      sessionStorage.setItem("prefill-prompt", prompt);
    } catch {
      /* ignore */
    }
    navigate({ to: "/music" });
  };

  const active = IMAGE_SAMPLES[index];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Real results
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          See what MOTIO2EDIT can do
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Swipe through before and after examples, then open the same edit in the studio.
        </p>
      </div>

      <div
        className="mt-8 overflow-hidden rounded-3xl border border-border bg-card p-4 sm:p-6"
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
              key={s.label}
              className={`transition-opacity duration-700 ${
                i === index ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
              }`}
              aria-hidden={i !== index}
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { src: s.before, tag: "Before" },
                  { src: s.after, tag: "After" },
                ].map((img) => (
                  <figure key={img.tag} className="relative overflow-hidden rounded-2xl border border-border">
                    <img
                      src={img.src}
                      alt={`${s.label} — ${img.tag}`}
                      loading="lazy"
                      width={500}
                      height={500}
                      className="protected-image aspect-square w-full object-cover"
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

        <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{active.label}</p>
            <h3 className="mt-1 font-bold">{active.title}</h3>
          </div>
          <Button onClick={() => tryEdit(active)} className="btn-animate">
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

        <div className="mt-5 flex justify-center gap-2">
          {IMAGE_SAMPLES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              aria-label={`Show ${s.label} example`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Video examples */}
      <div className="mt-12">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Video ideas to start with</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {VIDEO_SAMPLES.map((v) => (
            <div
              key={v.title}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary"
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
                  width={500}
                  height={500}
                  className="protected-image aspect-video w-full object-cover"
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
                <span className="absolute bottom-3 right-3 flex gap-1.5">
                  <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">10s</span>
                  <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">1080p</span>
                </span>
              </button>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-bold">{v.title}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{v.prompt}</p>
                <Button variant="outline" size="sm" className="btn-animate mt-4" onClick={() => tryVideo(v.prompt)}>
                  Generate similar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Music examples */}
      <div className="mt-12">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Music prompts to start with</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {MUSIC_SAMPLES.map((m) => {
            const isPlaying = playing === m.audio;
            return (
              <div
                key={m.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>
                    {m.icons}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {m.duration}
                  </span>
                </div>
                <p className="mt-3 font-bold">{m.title}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.genre} · {m.mood}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlay(m.audio)}
                    aria-label={isPlaying ? `Pause ${m.title}` : `Play ${m.title} preview`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                  </button>
                  <Waveform active={isPlaying} />
                </div>

                <p className="mt-4 flex-1 text-sm text-muted-foreground">{m.prompt}</p>
                <Button variant="outline" size="sm" className="btn-animate mt-4" onClick={() => tryMusic(m.prompt)}>
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
