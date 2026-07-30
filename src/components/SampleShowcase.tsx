import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Music, Sparkles } from "lucide-react";

import removalBefore from "@/assets/sample-removal-before.jpg";
import removalAfter from "@/assets/sample-removal-after.jpg";
import restoreBefore from "@/assets/sample-restore-before.jpg";
import restoreAfter from "@/assets/sample-restore-after.jpg";
import objectBefore from "@/assets/sample-object-before.jpg";
import objectAfter from "@/assets/sample-object-after.jpg";
import upscaleBefore from "@/assets/sample-upscale-before.jpg";
import upscaleAfter from "@/assets/sample-upscale-after.jpg";

type ImageSample = {
  label: string;
  title: string;
  before: string;
  after: string;
  prompt: string;
};

const IMAGE_SAMPLES: ImageSample[] = [
  {
    label: "People removal",
    title: "Remove strangers from your photo",
    before: removalBefore,
    after: removalAfter,
    prompt:
      "Remove the man on the left and the person in the background completely. Keep the two women exactly identical — same faces, clothing and pose. Rebuild the beach, sea and sand naturally where they stood.",
  },
  {
    label: "Photo restoration",
    title: "Restore and colorize old photos",
    before: restoreBefore,
    after: restoreAfter,
    prompt:
      "Restore this damaged vintage photo: remove scratches, creases and torn edges, add natural realistic color, sharpen faces and fine detail. Keep the same people, poses and composition.",
  },
  {
    label: "Object removal",
    title: "Erase clutter from any scene",
    before: objectBefore,
    after: objectAfter,
    prompt:
      "Remove the cardboard boxes and the plastic chair from the middle of the room. Reconstruct the floor and rug underneath naturally. Keep the rest of the room, sofa and lighting identical.",
  },
  {
    label: "Upscaling",
    title: "Turn blurry shots into sharp detail",
    before: upscaleBefore,
    after: upscaleAfter,
    prompt:
      "Upscale to razor-sharp high resolution: recover crisp fine detail in the mountains, trees, clouds and water reflection, remove blur and compression artifacts. Keep the same composition and colors.",
  },
];

const MUSIC_SAMPLES = [
  {
    title: "Cinematic trailer",
    meta: "Cinematic · Epic · 60s",
    prompt:
      "Epic cinematic trailer track with soaring strings, deep taiko drums and a triumphant brass finale, building tension into a powerful climax.",
  },
  {
    title: "Lofi study beat",
    meta: "Lofi · Chill · 45s",
    prompt:
      "Warm lofi hip hop beat with dusty vinyl crackle, mellow Rhodes piano chords, soft brushed drums and a laid-back bassline.",
  },
  {
    title: "Synthwave drive",
    meta: "Synthwave · Energetic · 60s",
    prompt:
      "Retro 80s synthwave track with pulsing analog bass, shimmering arpeggios, gated reverb drums and a neon-lit lead melody.",
  },
];

export function SampleShowcase() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setIndex((next + IMAGE_SAMPLES.length) % IMAGE_SAMPLES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % IMAGE_SAMPLES.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  const tryEdit = (prompt: string) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt, mode: "image" }));
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
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { src: s.before, tag: "Before" },
                  { src: s.after, tag: "After" },
                ].map((img) => (
                  <figure key={img.tag} className="relative overflow-hidden rounded-2xl border border-border">
                    <img
                      src={img.src}
                      alt={`${s.title} — ${img.tag}`}
                      loading="lazy"
                      width={768}
                      height={768}
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
          <Button onClick={() => tryEdit(active.prompt)} className="btn-animate">
            Try this edit <ArrowRight className="ml-1.5 h-4 w-4" />
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

      <div className="mt-10">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Music prompts to start with</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {MUSIC_SAMPLES.map((m) => (
            <div
              key={m.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <p className="font-bold">{m.title}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.meta}</p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{m.prompt}</p>
              <Button variant="outline" size="sm" className="mt-4 btn-animate" onClick={() => tryMusic(m.prompt)}>
                Try this track
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
