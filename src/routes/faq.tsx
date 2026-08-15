import { createFileRoute } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CREDIT_COST } from "@/lib/plans";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — MOTIO2EDIT" },
      {
        name: "description",
        content:
          "Frequently asked questions about MOTIO2EDIT: account, credits, billing, AI image and video editing, privacy, security, and subscription plans.",
      },
      { property: "og:title", content: "FAQ — MOTIO2EDIT" },
      { property: "og:description", content: "Answers about account, credits, billing, AI editing, privacy, and plans." },
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
        q: "How does Auto Edit work?",
        a: "Auto Edit is designed so you can describe the change in plain language (for example, remove a person or change a shirt). The editor focuses on the requested change and aims to preserve parts of the image you did not ask to modify. Results depend on prompt clarity and source quality.",
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
        a: "JPG, PNG, and WEBP are supported. Higher-resolution sources generally produce better results.",
      },
      {
        q: `How many credits does image editing use?`,
        a: `Image generation and editing costs ${CREDIT_COST.image} credits per result. Your balance updates after each successful generation.`,
      },
    ],
  },
  {
    title: "Video",
    items: [
      {
        q: "How does video generation work?",
        a: "On a paid plan with video access (Lite and above), open Video Studio or the editor in video mode. Use text-to-video or image-to-video presets, then generate. Processing takes longer than images.",
      },
      {
        q: "What video modes are available?",
        a: "Text-to-video and image-to-video, plus cinematic motion presets such as push-in, orbit, slow-motion, and product spin — depending on what is enabled in Video Studio.",
      },
      {
        q: "Does generated video include audio?",
        a: "Current video generation may produce silent video depending on the provider model. Do not assume an audio track is included. Music can be created separately in Music Studio where your plan allows.",
      },
      {
        q: `How many credits does video use?`,
        a: `Video generation costs ${CREDIT_COST.video} credits per result on plans that include video.`,
      },
    ],
  },
  {
    title: "Credits & Plans",
    items: [
      {
        q: "How do credits work?",
        a: `Every generation spends credits. Image costs ${CREDIT_COST.image} credits, video ${CREDIT_COST.video}, and music ${CREDIT_COST.music} (music lite ${CREDIT_COST.music_lite} where applicable). Your balance is shown on the home page, dashboard, and header areas.`,
      },
      {
        q: "What does each plan include?",
        a: "Free includes image editing with a signup credit bonus and watermarks; video and music require upgrade. Lite and above add video and music with increasing monthly credits and quality options. See Pricing for the live feature list — the Pricing page is the source of truth.",
      },
      {
        q: "What happens when credits run out?",
        a: "Generation is blocked until you have enough credits again. You can upgrade your plan or purchase a credit top-up where available.",
      },
      {
        q: "Do credits expire?",
        a: "Monthly plan credits refresh with each billing cycle. Free signup credits remain until used. One-time top-ups follow the product rules described on Pricing.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        q: "How do I change my language?",
        a: "Open Settings → Language and choose a supported locale. The preference is saved in your browser and applied to the translated parts of the app.",
      },
      {
        q: "How do I manage my account?",
        a: "Use Profile (dashboard) for plan and credits at a glance, and Settings for display name, password, theme, language, and notifications.",
      },
      {
        q: "How do I contact support?",
        a: "Open Support or Tickets from Profile/Support. You can also email support@motio2edit.com. Include your account email and a short description of the issue.",
      },
      {
        q: "How do I reset my password?",
        a: "On the sign-in page, use the reset-password link, or change password in Settings → Security when signed in.",
      },
    ],
  },
  {
    title: "Payments & Security",
    items: [
      {
        q: "What payment methods are supported?",
        a: "Card (via configured processors such as Razorpay/PayPal depending on currency) and crypto where enabled. We do not store full card numbers.",
      },
      {
        q: "Is my content private?",
        a: "Your generations stay tied to your account. We do not sell your content. Files are processed as needed to deliver AI results through trusted providers.",
      },
      {
        q: "Is payment information secure?",
        a: "Payments are handled by payment processors. Full card details are not stored on Motio2edit servers.",
      },
    ],
  },
  {
    title: "Refunds",
    items: [
      {
        q: "What is your refund policy?",
        a: "Refunds are reviewed case by case for billing errors or technical issues. Contact Support with your account details.",
      },
      {
        q: "Are used credits refundable?",
        a: "Credits already spent on completed generations are generally non-refundable, but contact Support if something went wrong.",
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
      <div className="mx-auto max-w-3xl px-4 py-12 pb-24 sm:py-16 md:pb-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">Everything you need to know about MOTIO2EDIT.</p>

        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">No results found for “{query}”.</p>
        ) : (
          <div className="mt-10 space-y-10">
            {filtered.map((cat) => (
              <section key={cat.title}>
                <h2 className="text-lg font-bold">{cat.title}</h2>
                <Accordion type="single" collapsible className="mt-3">
                  {cat.items.map((item, i) => (
                    <AccordionItem key={i} value={`${cat.title}-${i}`}>
                      <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </div>
      <FooterAd />
      <Footer />
    </div>
  );
}
