import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ImageIcon, Eraser, Wand2, Scissors, Palette, ArrowUpRightSquare, Sparkles,
  Sun, Users, Building2, ShoppingBag, Camera, PencilRuler, Layers, Crop,
} from "lucide-react";

export const Route = createFileRoute("/studio/image")({
  head: () => ({
    meta: [
      { title: "Image Studio — MOTIO2EDIT" },
      { name: "description", content: "AI photo editing, generation, restoration, and creative presets — all in one workspace." },
      { property: "og:title", content: "Image Studio — MOTIO2EDIT" },
      { property: "og:description", content: "AI photo editing, generation, restoration, and creative presets — all in one workspace." },
    ],
  }),
  component: ImageStudio,
});

type Preset = {
  name: string;
  desc: string;
  icon: typeof ImageIcon;
  prompt: string;
  needsImage: boolean;
};

const CATEGORIES: { label: string; presets: Preset[] }[] = [
  {
    label: "Core edits",
    presets: [
      { name: "Remove object", desc: "Erase anything you circle", icon: Eraser, prompt: "Remove the highlighted object completely. Reconstruct the background naturally with matching textures, lighting and shadows.", needsImage: true },
      { name: "Replace background", desc: "Swap the scene behind the subject", icon: Layers, prompt: "Replace the background with a clean modern studio backdrop while keeping the subject perfectly intact.", needsImage: true },
      { name: "Remove background", desc: "Transparent PNG output", icon: Scissors, prompt: "Remove the background entirely, keep only the main subject on a clean transparent background.", needsImage: true },
      { name: "Magic eraser", desc: "Clean up small distractions", icon: Wand2, prompt: "Remove small distractions and clutter from the image. Preserve the main subject and overall lighting.", needsImage: true },
    ],
  },
  {
    label: "Quality & restoration",
    presets: [
      { name: "Upscale 2x", desc: "Sharper, higher-resolution result", icon: ArrowUpRightSquare, prompt: "Upscale this image to twice the resolution with sharper, cleaner details. Preserve identity and composition exactly.", needsImage: true },
      { name: "Face restoration", desc: "Fix blurry or old portraits", icon: Users, prompt: "Restore the face with realistic skin, natural eyes and clean details. Do not change identity or expression.", needsImage: true },
      { name: "Old photo restore", desc: "Repair scratches, fade, noise", icon: Camera, prompt: "Restore this old photograph. Remove scratches, dust, fading and noise. Keep the original composition and identity.", needsImage: true },
      { name: "Colorize", desc: "Bring B&W photos to life", icon: Palette, prompt: "Colorize this black and white photograph with realistic natural colors. Keep every detail and composition unchanged.", needsImage: true },
    ],
  },
  {
    label: "Portrait & retouch",
    presets: [
      { name: "Studio lighting", desc: "Add pro portrait lighting", icon: Sun, prompt: "Add professional studio lighting: soft key light from the front-left, gentle fill and rim light. Do not change identity.", needsImage: true },
      { name: "Skin retouch", desc: "Natural clean skin", icon: Sparkles, prompt: "Retouch the skin naturally: remove blemishes, soften slightly, keep pores and realistic texture. Do not change identity.", needsImage: true },
      { name: "HDR enhancement", desc: "Punchier tones & clarity", icon: Wand2, prompt: "Enhance this photo with cinematic HDR: richer contrast, balanced highlights and shadows, natural saturation.", needsImage: true },
      { name: "AI headshot", desc: "Corporate-ready portrait", icon: Users, prompt: "Turn this photo into a corporate headshot: neutral studio background, sharp professional lighting, business attire look.", needsImage: true },
    ],
  },
  {
    label: "Generate & style",
    presets: [
      { name: "Cartoon style", desc: "Convert to cartoon look", icon: PencilRuler, prompt: "Convert this image into a clean cartoon illustration style with bold lines and vibrant color.", needsImage: true },
      { name: "Anime style", desc: "Anime-inspired result", icon: PencilRuler, prompt: "Convert this image into a modern anime illustration with expressive eyes and clean cell shading.", needsImage: true },
      { name: "Product photo", desc: "Ecommerce-ready shot", icon: ShoppingBag, prompt: "Turn this into a clean e-commerce product shot on a pure white background with soft even lighting and a subtle floor shadow.", needsImage: true },
      { name: "Interior design", desc: "Restyle a room", icon: Building2, prompt: "Restyle this room in modern minimalist interior design with warm natural light, keeping the walls, windows and layout the same.", needsImage: true },
      { name: "Generate from text", desc: "Text-to-image", icon: Sparkles, prompt: "", needsImage: false },
      { name: "Smart crop", desc: "Aspect-ratio focused crop", icon: Crop, prompt: "", needsImage: false },
    ],
  },
];

function ImageStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const openBlank = () => {
    try { sessionStorage.setItem("motio2edit-mode", "image"); } catch { /* ignore */ }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  const applyPreset = (p: Preset) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({ prompt: p.prompt, mode: "image", ts: Date.now() }),
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
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Image <span className="text-primary">Studio</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick a preset or open a blank editor.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: user ? "/editor" : "/auth" })}>Open blank editor</Button>
          </div>
        </div>

        <div className="space-y-8">
          {CATEGORIES.map((cat) => (
            <section key={cat.label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {cat.presets.map((p) => {
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
