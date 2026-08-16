import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  Eraser, Scissors, Layers, Wand2, ArrowUpRightSquare, Users, Camera, Palette,
  Sun, Sparkles, PencilRuler, ShoppingBag, Building2, Crop, Shirt, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/studio/image/tools")({
  head: () => ({
    meta: [
      { title: "Image Tools — Motio2edit" },
      {
        name: "description",
        content:
          "Explore Motio2edit image tools: Circle to Remove, background removal, restoration, upscale, portrait, product, and more.",
      },
    ],
  }),
  component: ImageToolsPage,
});

type Tool = {
  name: string;
  summary: string;
  when: string;
  example: string;
  prompt: string;
  needsImage: boolean;
  icon: typeof Eraser;
  /** Dedicated product route instead of prompt preset into editor */
  href?: "/studio/image/circle-remove" | "/studio/image/auto-edit" | "/studio/image/multi";
};

type Category = { label: string; tools: Tool[] };

const CATEGORIES: Category[] = [
  {
    label: "Remove & Cleanup",
    tools: [
      {
        name: "Circle to Remove",
        summary: "Mark an unwanted object or person and remove it while reconstructing the surrounding area.",
        when: "People in the background, poles, logos, clutter.",
        example: "Circle a bystander → clean background fill.",
        prompt: "",
        needsImage: true,
        icon: Eraser,
        href: "/studio/image/circle-remove",
      },
      {
        name: "Object Removal",
        summary: "Erase objects from a scene using a clear text instruction.",
        when: "You can describe what to remove without marking.",
        example: "Remove the cup on the table.",
        prompt: "Remove the unwanted object completely and rebuild the background naturally.",
        needsImage: true,
        icon: Wand2,
      },
      {
        name: "Background Removal",
        summary: "Separate the main subject and produce a clean cut-out.",
        when: "Product shots, stickers, compositing.",
        example: "Subject on transparent / plain background.",
        prompt: "Remove the background entirely, keep only the main subject on a clean transparent background.",
        needsImage: true,
        icon: Scissors,
      },
      {
        name: "Background Replacement",
        summary: "Keep the subject intact and swap only the backdrop.",
        when: "Portraits, ecommerce, social profiles.",
        example: "Studio backdrop behind a person.",
        prompt: "Replace the background with a clean modern studio backdrop while keeping the subject perfectly intact.",
        needsImage: true,
        icon: Layers,
      },
      {
        name: "Magic Eraser",
        summary: "Clean small distractions without changing the main subject.",
        when: "Wires, dust, minor clutter.",
        example: "Remove power lines from a sky.",
        prompt: "Remove small distractions and clutter from the image. Preserve the main subject and overall lighting.",
        needsImage: true,
        icon: Wand2,
      },
    ],
  },
  {
    label: "Enhance & Restore",
    tools: [
      {
        name: "Auto Edit",
        summary: "Analyze the photo and apply a structured improvement plan without writing a prompt.",
        when: "You want automatic professional polish.",
        example: "Upload → analyze → confirm operations → result.",
        prompt: "",
        needsImage: true,
        icon: Sparkles,
        href: "/studio/image/auto-edit",
      },
      {
        name: "Multi-Image",
        summary: "Combine primary + reference images in one paid-plan job.",
        when: "Outfit transfer, multi-reference edits.",
        example: "Person + clothing reference → combined edit.",
        prompt: "",
        needsImage: true,
        icon: Layers,
        href: "/studio/image/multi",
      },
      {
        name: "Upscale",
        summary: "Increase resolution and recover sharper detail.",
        when: "Low-res photos, social exports.",
        example: "Soft phone photo → clearer detail.",
        prompt: "Upscale this image to twice the resolution with sharper, cleaner details. Preserve identity and composition exactly.",
        needsImage: true,
        icon: ArrowUpRightSquare,
      },
      {
        name: "Face Restoration",
        summary: "Recover facial detail on soft or aged portraits while locking identity.",
        when: "Blurry faces, older scans.",
        example: "Soft portrait → clearer eyes and skin detail.",
        prompt: "Restore the face with realistic skin, natural eyes and clean details. Do not change identity or expression.",
        needsImage: true,
        icon: Users,
      },
      {
        name: "Old Photo Restoration",
        summary: "Repair scratches, fade, and noise on vintage photos.",
        when: "Scanned family photos, damaged prints.",
        example: "Scratched scan → cleaned photograph.",
        prompt: "Restore this old photograph. Remove scratches, dust, fading and noise. Keep the original composition and identity.",
        needsImage: true,
        icon: Camera,
      },
      {
        name: "Colorize",
        summary: "Add natural color to black-and-white images.",
        when: "Historical or B&W photos.",
        example: "B&W portrait → natural color.",
        prompt: "Colorize this black and white photograph with realistic natural colors. Keep every detail and composition unchanged.",
        needsImage: true,
        icon: Palette,
      },
      {
        name: "HDR Enhancement",
        summary: "Richer contrast and balanced tones.",
        when: "Flat or dull lighting.",
        example: "Muted landscape → clearer dynamic range.",
        prompt: "Enhance this photo with cinematic HDR: richer contrast, balanced highlights and shadows, natural saturation.",
        needsImage: true,
        icon: Wand2,
      },
      {
        name: "Studio Lighting",
        summary: "Add soft professional key and fill lighting without changing identity.",
        when: "Casual portraits needing polish.",
        example: "Room light → studio-style portrait.",
        prompt: "Add professional studio lighting: soft key light from the front-left, gentle fill and rim light. Do not change identity.",
        needsImage: true,
        icon: Sun,
      },
    ],
  },
  {
    label: "Portrait & Creative",
    tools: [
      {
        name: "Skin Retouch",
        summary: "Natural cleanup of blemishes while keeping realistic texture.",
        when: "Beauty and headshot polish.",
        example: "Blemish cleanup without plastic skin.",
        prompt: "Retouch the skin naturally: remove blemishes, soften slightly, keep pores and realistic texture. Do not change identity.",
        needsImage: true,
        icon: Sparkles,
      },
      {
        name: "Clothing Change",
        summary: "Change outfits while preserving the person and scene.",
        when: "Wardrobe experiments, catalog looks.",
        example: "Casual tee → formal jacket.",
        prompt: "Change the clothing to a professional look while preserving the person's identity, pose and background.",
        needsImage: true,
        icon: Shirt,
      },
      {
        name: "AI Headshot",
        summary: "Corporate-ready portrait treatment from a casual photo.",
        when: "LinkedIn, profiles, teams.",
        example: "Casual selfie → headshot look.",
        prompt: "Turn this photo into a corporate headshot: neutral studio background, sharp professional lighting, business attire look.",
        needsImage: true,
        icon: Users,
      },
      {
        name: "Style Transformation",
        summary: "Restyle an image into cartoon, anime, or artistic looks.",
        when: "Creative variants of an existing photo.",
        example: "Photo → clean cartoon illustration.",
        prompt: "Convert this image into a clean cartoon illustration style with bold lines and vibrant color.",
        needsImage: true,
        icon: PencilRuler,
      },
    ],
  },
  {
    label: "Generate & Design",
    tools: [
      {
        name: "Product Photo",
        summary: "Clean ecommerce product treatment on a neutral background.",
        when: "Listings and catalogs.",
        example: "Messy desk shot → white-background product.",
        prompt: "Turn this into a clean e-commerce product shot on a pure white background with soft even lighting and a subtle floor shadow.",
        needsImage: true,
        icon: ShoppingBag,
      },
      {
        name: "Interior Design",
        summary: "Restyle room finishes while keeping layout and windows.",
        when: "Design exploration from a room photo.",
        example: "Cluttered room → modern minimal look.",
        prompt: "Restyle this room in modern minimalist interior design with warm natural light, keeping the walls, windows and layout the same.",
        needsImage: true,
        icon: Building2,
      },
      {
        name: "Text to Image",
        summary: "Generate a new image from a text description (no upload required).",
        when: "Concepts, scenes, marketing visuals.",
        example: "Describe a sunset city skyline → new image.",
        prompt: "",
        needsImage: false,
        icon: Sparkles,
      },
      {
        name: "Smart Crop",
        summary: "Reframe to common aspect ratios inside the editor crop tool.",
        when: "Social formats 1:1, 4:5, 16:9.",
        example: "Wide photo → square crop.",
        prompt: "",
        needsImage: false,
        icon: Crop,
      },
    ],
  },
];

function ImageToolsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const openEditor = (prompt: string) => {
    try {
      sessionStorage.setItem("motio2edit-mode", "image");
      if (prompt) {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({ prompt, mode: "image", ts: Date.now() }),
        );
      } else {
        sessionStorage.removeItem("motio2edit-preset");
      }
    } catch {
      /* ignore */
    }
    navigate({ to: user ? "/editor" : "/auth" });
  };

  const openTool = (tool: Tool) => {
    if (tool.href) {
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      navigate({ to: tool.href });
      return;
    }
    openEditor(tool.prompt);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-24 md:pb-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/studio/image" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              ← Image Studio
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              AI Image <span className="text-primary">Tools</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Real features open dedicated tools. Prompt presets open the Image Editor workspace.
            </p>
          </div>
          <Button size="lg" onClick={() => openEditor("")} className="w-full sm:w-auto">
            Open Image Editor
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-10">
          {CATEGORIES.map((cat) => (
            <section key={cat.label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <article
                      key={tool.name}
                      className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-border bg-background/60 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold">{tool.name}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.summary}</p>
                        </div>
                      </div>
                      <dl className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                        <div>
                          <dt className="font-semibold text-foreground/80">When to use</dt>
                          <dd>{tool.when}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-foreground/80">Example</dt>
                          <dd>{tool.example}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-foreground/80">Input</dt>
                          <dd>
                            {tool.href
                              ? "Dedicated feature page"
                              : tool.needsImage
                                ? "Upload a photo, then generate"
                                : "Prompt only or editor tool"}
                          </dd>
                        </div>
                      </dl>
                      <Button
                        size="sm"
                        className="mt-4 w-full"
                        variant={tool.href ? "default" : "outline"}
                        onClick={() => openTool(tool)}
                      >
                        {tool.href ? "Open feature" : "Open Image Editor"}
                      </Button>
                    </article>
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
