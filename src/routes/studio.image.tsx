import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  ImageIcon, Eraser, Wand2, Scissors, Palette, ArrowUpRightSquare, Sparkles,
  Sun, Users, Building2, ShoppingBag, Camera, PencilRuler, Layers, Crop, ArrowRight,
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
  detail: string;
  icon: typeof ImageIcon;
  prompt: string;
  needsImage: boolean;
  mode: "edit" | "generate";
};

const CATEGORIES: { label: string; presets: Preset[] }[] = [
  {
    label: "Core edits",
    presets: [
      {
        name: "Remove object",
        desc: "Erase anything you circle",
        detail: "Upload a photo → mark the object → AI rebuilds the background. Best for people, clutter, poles, logos.",
        icon: Eraser,
        prompt: "Remove the highlighted object completely. Reconstruct the background naturally with matching textures, lighting and shadows.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Replace background",
        desc: "Swap the scene behind the subject",
        detail: "Keeps the subject intact and swaps only the backdrop. Ideal for portraits and product shots.",
        icon: Layers,
        prompt: "Replace the background with a clean modern studio backdrop while keeping the subject perfectly intact.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Remove background",
        desc: "Transparent / clean cut-out",
        detail: "Produces a clean subject cut-out. Use for stickers, product listings, or compositing.",
        icon: Scissors,
        prompt: "Remove the background entirely, keep only the main subject on a clean transparent background.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Magic eraser",
        desc: "Clean up small distractions",
        detail: "Removes wires, dust, small clutter without changing the main subject or lighting.",
        icon: Wand2,
        prompt: "Remove small distractions and clutter from the image. Preserve the main subject and overall lighting.",
        needsImage: true,
        mode: "edit",
      },
    ],
  },
  {
    label: "Quality & restoration",
    presets: [
      {
        name: "Upscale 2x",
        desc: "Sharper, higher-resolution result",
        detail: "Doubles resolution while recovering detail. Good for low-res photos and social exports.",
        icon: ArrowUpRightSquare,
        prompt: "Upscale this image to twice the resolution with sharper, cleaner details. Preserve identity and composition exactly.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Face restoration",
        desc: "Fix blurry or old portraits",
        detail: "Restores facial detail on soft or aged portraits while locking identity.",
        icon: Users,
        prompt: "Restore the face with realistic skin, natural eyes and clean details. Do not change identity or expression.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Old photo restore",
        desc: "Repair scratches, fade, noise",
        detail: "Repairs damage on scanned or vintage photos. Keeps original composition.",
        icon: Camera,
        prompt: "Restore this old photograph. Remove scratches, dust, fading and noise. Keep the original composition and identity.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Colorize",
        desc: "Bring B&W photos to life",
        detail: "Adds natural color to black-and-white images without changing structure.",
        icon: Palette,
        prompt: "Colorize this black and white photograph with realistic natural colors. Keep every detail and composition unchanged.",
        needsImage: true,
        mode: "edit",
      },
    ],
  },
  {
    label: "Portrait & retouch",
    presets: [
      {
        name: "Studio lighting",
        desc: "Add pro portrait lighting",
        detail: "Relights the subject with soft key + fill. Does not change face identity.",
        icon: Sun,
        prompt: "Add professional studio lighting: soft key light from the front-left, gentle fill and rim light. Do not change identity.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Skin retouch",
        desc: "Natural clean skin",
        detail: "Softens blemishes while keeping realistic skin texture and identity.",
        icon: Sparkles,
        prompt: "Retouch the skin naturally: remove blemishes, soften slightly, keep pores and realistic texture. Do not change identity.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "HDR enhancement",
        desc: "Punchier tones & clarity",
        detail: "Expands dynamic range and local contrast for a richer look.",
        icon: Wand2,
        prompt: "Enhance this photo with cinematic HDR: richer contrast, balanced highlights and shadows, natural saturation.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "AI headshot",
        desc: "Corporate-ready portrait",
        detail: "Turns a casual photo into a professional headshot look while preserving the face.",
        icon: Users,
        prompt: "Turn this photo into a corporate headshot: neutral studio background, sharp professional lighting, business attire look.",
        needsImage: true,
        mode: "edit",
      },
    ],
  },
  {
    label: "Generate & style",
    presets: [
      {
        name: "Cartoon style",
        desc: "Convert to cartoon look",
        detail: "Style transfer on your uploaded image — composition stays, look becomes cartoon.",
        icon: PencilRuler,
        prompt: "Convert this image into a clean cartoon illustration style with bold lines and vibrant color.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Anime style",
        desc: "Anime-inspired result",
        detail: "Restyles the uploaded image into modern anime illustration.",
        icon: PencilRuler,
        prompt: "Convert this image into a modern anime illustration with expressive eyes and clean cell shading.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Product photo",
        desc: "Ecommerce-ready shot",
        detail: "Clean white-background product treatment for listings.",
        icon: ShoppingBag,
        prompt: "Turn this into a clean e-commerce product shot on a pure white background with soft even lighting and a subtle floor shadow.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Interior design",
        desc: "Restyle a room",
        detail: "Restyles room finishes while keeping layout and windows.",
        icon: Building2,
        prompt: "Restyle this room in modern minimalist interior design with warm natural light, keeping the walls, windows and layout the same.",
        needsImage: true,
        mode: "edit",
      },
      {
        name: "Generate from text",
        desc: "Text-to-image",
        detail: "No upload required. Describe a scene and generate a new image from scratch.",
        icon: Sparkles,
        prompt: "",
        needsImage: false,
        mode: "generate",
      },
      {
        name: "Smart crop",
        desc: "Aspect-ratio focused crop",
        detail: "Opens the editor crop tool so you can reframe to 1:1, 4:5, 16:9, and more.",
        icon: Crop,
        prompt: "",
        needsImage: false,
        mode: "edit",
      },
    ],
  },
];

function ImageStudio() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const openBlank = () => {
    try {
      sessionStorage.setItem("motio2edit-mode", "image");
      sessionStorage.removeItem("motio2edit-preset");
    } catch {
      /* ignore */
    }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  const applyPreset = (p: Preset) => {
    try {
      sessionStorage.setItem(
        "motio2edit-preset",
        JSON.stringify({ prompt: p.prompt, mode: "image", ts: Date.now() }),
      );
      sessionStorage.setItem("motio2edit-mode", "image");
    } catch {
      /* ignore */
    }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-24 md:pb-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/studio" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              {t("studio.allStudios")}
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              {t("studio.image").replace(" Studio", "")} <span className="text-primary">Studio</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("studio.imageLead")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button size="lg" onClick={openBlank} className="w-full sm:w-auto">
              {t("studio.openEditor")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/studio/image/tools">Explore Image Tools</Link>
            </Button>
            <p className="text-[11px] text-muted-foreground">{t("studio.uploadOwn")}</p>
          </div>
        </div>

        {/* Real feature surfaces — before discovery presets */}
        <div className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/editor"
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <p className="text-sm font-semibold text-primary">Image Editor</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Full workspace</p>
          </Link>
          <Link
            to="/studio/image/auto-edit"
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-semibold">Auto Edit</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Analyze & structured plan</p>
          </Link>
          <Link
            to="/studio/image/multi"
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-semibold">Multi-Image</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Paid · references</p>
          </Link>
          <Link
            to="/studio/image/circle-remove"
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <p className="text-sm font-semibold">Circle to Remove</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Mask remove / add</p>
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{t("studio.preferFull")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("studio.preferFullDesc")}</p>
            </div>
            <Button variant="outline" onClick={openBlank} className="w-full shrink-0 sm:w-auto">
              {t("studio.openEditorShort")}
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {CATEGORIES.map((cat) => (
            <section key={cat.label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cat.presets.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className="rounded-lg border border-border bg-background/60 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {p.mode === "generate"
                            ? t("common.generate")
                            : p.needsImage
                              ? t("common.editPhoto")
                              : t("common.tool")}
                        </span>
                      </div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                      <div className="mt-auto pt-1 text-[11px] leading-snug text-muted-foreground/90">{p.detail}</div>
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
