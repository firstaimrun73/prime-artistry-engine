import { createFileRoute } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Motio2edit" },
      {
        name: "description",
        content: "Frequently asked questions about Motio2edit image, video, and music AI tools.",
      },
    ],
  }),
  component: FAQ,
});

type QA = { q: string; a: string };
type Category = { title: string; items: QA[] };

const CATEGORIES: Category[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I edit an image?",
        a: "Open the Image Editor (or Image Studio → Open Image Editor). Upload a photo, describe the change you want, and generate. You can also explore tools on the Image Tools page, then open the editor with a preset.",
      },
      {
        q: "What is the center Auto (+) button?",
        a: "On mobile, the center tab opens Auto Edit. The + mark periodically animates into a sparkle logo and shows “Auto edit” so you can find one-tap photo improvement without writing a prompt.",
      },
      {
        q: "How does Auto Edit work?",
        a: "Upload one photo. Motio2edit analyzes the image on fal.ai and applies cleanup edits (restore, declutter, background tidy, etc.) without requiring a prompt. Quality tiers change credit cost. Typical jobs stay under a few credits path configured on the server.",
      },
      {
        q: "How do I generate an image from text?",
        a: "In the Image Editor or Image Tools, choose Text to Image (or leave the canvas without an upload), describe the scene, and generate. Text-to-image still uses your credit balance.",
      },
      {
        q: "How do I create an account?",
        a: "Click Sign in, then register with email and password or continue with Google. Your account and starter credits are created when signup completes.",
      },
    ],
  },
  {
    title: "Image Editing",
    items: [
      {
        q: "What can I remove?",
        a: "You can remove people, objects, logos, and clutter using text prompts or Circle to Remove when available in the editor. Complex scenes may need a clearer prompt or a second pass.",
      },
      {
        q: "How does Circle to Remove work?",
        a: "In the Image Editor, mark the region to remove, then generate. The system aims to reconstruct the surrounding area so the object is gone. Open Image Tools → Circle to Remove for a guided path into the editor.",
      },
      {
        q: "Can I change clothing?",
        a: "Yes — describe the outfit change in the prompt (or use the Clothing Change tool entry). Identity and background preservation depend on the photo and instruction.",
      },
      {
        q: "Can I restore old photos?",
        a: "Yes — use Old Photo Restoration from Image Studio or Image Tools, or describe restoration in the editor prompt (scratches, fade, noise).",
      },
      {
        q: "What image formats can I upload?",
        a: "JPG, PNG, and WEBP are supported. Higher-resolution sources generally produce better results. Maximum upload size is about 40 MB.",
      },
    ],
  },
  {
    title: "Music Studio",
    items: [
      {
        q: "Who can use Music Studio?",
        a: "Music generation is available on Lite and higher plans. Free accounts can still use Image Studio. Administrators always have full Music Studio access.",
      },
      {
        q: "Why can’t I generate music?",
        a: "Confirm you are on Lite+ (or admin), that you have enough credits for the selected mode and duration, and that the prompt (or image/video attachment) is filled for the mode you chose. Failed jobs do not charge credits.",
      },
      {
        q: "What can I create in Music Studio?",
        a: "Songs, instrumentals, voiceovers, and sound effects. Some modes accept an image or video for mood/sync guidance.",
      },
    ],
  },
  {
    title: "Credits & Plans",
    items: [
      {
        q: "How do credits work?",
        a: "Each generation spends credits based on media type and quality. Failed generations do not charge credits. Your balance is shown in the header and dashboard.",
      },
      {
        q: "Do free accounts have a watermark?",
        a: "Free image outputs may include watermark protection. Paid plans unlock cleaner downloads according to plan rules.",
      },
    ],
  },
];

function FAQ() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">Everything you need to know about MOTIO2EDIT.</p>
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="pl-9"
          />
        </div>
        <div className="mt-10 space-y-10">
          {filtered.map((cat) => (
            <section key={cat.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.title}</h2>
              <div className="mt-3 space-y-4">
                {cat.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-border bg-card px-4 py-3 open:shadow-sm"
                  >
                    <summary className="cursor-pointer list-none font-medium marker:content-none">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No matches. Try a different search.</p>
          )}
        </div>
      </main>
      <FooterAd />
      <Footer />
    </div>
  );
}
