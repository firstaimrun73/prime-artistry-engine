import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Video, Film, Play, Zap, Sparkles, Camera, Wand2 } from "lucide-react";

export const Route = createFileRoute("/studio/video")({
  head: () => ({
    meta: [
      { title: "Video Studio — MOTIO2EDIT" },
      { name: "description", content: "Cinematic AI video generation: text-to-video, image-to-video, and modern motion presets." },
      { property: "og:title", content: "Video Studio — MOTIO2EDIT" },
      { property: "og:description", content: "Cinematic AI video generation: text-to-video, image-to-video, and modern motion presets." },
    ],
  }),
  component: VideoStudio,
});

type Preset = { name: string; desc: string; icon: typeof Video; prompt: string; needsImage: boolean };

const PRESETS: { label: string; items: Preset[] }[] = [
  {
    label: "Generate",
    items: [
      { name: "Text to video", desc: "Describe the scene, we render it", icon: Sparkles, prompt: "", needsImage: false },
      { name: "Image to video", desc: "Animate a still image", icon: Camera, prompt: "Bring this image to life with gentle cinematic motion.", needsImage: true },
    ],
  },
  {
    label: "Cinematic presets",
    items: [
      { name: "Slow push in", desc: "Subtle dolly toward subject", icon: Play, prompt: "Slow cinematic push-in toward the subject. Shallow depth of field. Natural motion.", needsImage: true },
      { name: "Reveal orbit", desc: "Smooth arc reveal", icon: Film, prompt: "Smooth cinematic camera arc revealing the subject. Gentle parallax on background.", needsImage: true },
      { name: "Dreamy slow-mo", desc: "Elegant slowed motion", icon: Zap, prompt: "Dreamy slow-motion movement, soft lighting, elegant pacing.", needsImage: true },
      { name: "Product spin", desc: "Turntable-style hero", icon: Wand2, prompt: "Product turntable rotation with clean studio lighting, subtle floor reflection.", needsImage: true },
    ],
  },
];

function VideoStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const applyPreset = (p: Preset) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({ prompt: p.prompt, mode: "video", ts: Date.now() }),
      );
    } catch { /* ignore */ }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/studio" className="text-xs font-medium text-muted-foreground hover:text-foreground">← All studios</Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Video <span className="text-primary">Studio</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">Cinematic AI motion presets — open a blank editor or pick a starting point.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: user ? "/editor" : "/auth" })}>Open blank editor</Button>
          </div>
        </div>

        <div className="space-y-8">
          {PRESETS.map((cat) => (
            <section key={cat.label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {cat.items.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="rounded-lg border border-border bg-background/60 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
