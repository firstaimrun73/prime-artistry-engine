import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — MOTIO2EDIT" },
      { name: "description", content: "Frequently asked questions about MOTIO2EDIT: credits, image and video generation, billing, refunds, account, and privacy." },
      { property: "og:title", content: "FAQ — MOTIO2EDIT" },
      { property: "og:description", content: "Answers about credits, generation, billing, refunds, account and privacy." },
    ],
  }),
  component: FAQ,
});

type QA = { q: string; a: string };
type Category = { title: string; items: QA[] };

const CATEGORIES: Category[] = [
  {
    title: "Credits & Usage",
    items: [
      { q: "How do credits work?", a: "Every generation spends credits. Image generation costs 12 credits and video generation costs 60 credits. Your balance shows in the header and on your dashboard." },
      { q: "How many credits do I get for free?", a: "Free accounts start with 50 credits — about 4 images. Paid plans add a much larger monthly allowance." },
      { q: "Do credits roll over?", a: "Monthly plan credits refresh each billing cycle. Plan your generations within the cycle for best value." },
    ],
  },
  {
    title: "Image Generation",
    items: [
      { q: "How does image generation work?", a: "Enter a prompt (and optionally upload a reference). Our AI processes it on secure servers and returns a result you can preview and download." },
      { q: "What export quality do I get?", a: "Free uses standard export quality. Plus unlocks HD exports, and Pro/Studio add 4K and premium AI models." },
      { q: "How much does an image cost?", a: "Each image generation costs 12 credits regardless of plan." },
    ],
  },
  {
    title: "Video Generation",
    items: [
      { q: "Is video available on every plan?", a: "No. Video generation is available on the Pro and Studio plans. Free and Plus are image-only." },
      { q: "How much does a video cost?", a: "Each video generation costs 60 credits, reflecting its higher processing cost." },
      { q: "Why is video slower than image?", a: "Video requires significantly more compute. Pro and Studio include priority processing for faster results." },
    ],
  },
  {
    title: "Billing & Subscription",
    items: [
      { q: "What plans are available?", a: "Free, Plus, Pro and Studio. Each tier adds more credits, faster processing, higher export quality and more features." },
      { q: "What payment methods can I use?", a: "Card (Stripe) everywhere, plus UPI and Crypto in supported regions. Switch currency on the pricing page to see local options." },
      { q: "How do I upgrade or change plans?", a: "Open the Pricing page, choose a plan, and complete checkout. Your new allowance applies right away." },
    ],
  },
  {
    title: "Refunds",
    items: [
      { q: "What is your refund policy?", a: "Credit purchases and subscriptions are generally non-refundable once credits have been used." },
      { q: "I was charged in error — what now?", a: "Open a ticket with the Payment category and we'll review the charge and respond." },
    ],
  },
  {
    title: "Account",
    items: [
      { q: "How do I change my password?", a: "Sign in and open Settings to update your password at any time, or use the reset link on the sign-in page." },
      { q: "Can I delete my account?", a: "Yes. Request account deletion from Settings or by opening a ticket, and we'll remove your data." },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { q: "Who can see my generations?", a: "Only you. Content is isolated per account with strict access controls and row-level security." },
      { q: "Is my connection encrypted?", a: "Yes. All traffic uses TLS/SSL encryption, and sensitive data is encrypted at rest. See the Security page for details." },
      { q: "Do you sell my data?", a: "No. We never sell your data. You own your content and can download or delete it." },
    ],
  },
];

function FAQ() {
  let counter = 0;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">
          Everything about credits, generation, billing, refunds, account and privacy.
        </p>

        <div className="mt-10 space-y-10">
          {CATEGORIES.map((cat) => (
            <section key={cat.title}>
              <h2 className="text-lg font-bold text-primary">{cat.title}</h2>
              <Accordion type="single" collapsible className="mt-3">
                {cat.items.map((item) => {
                  const id = `item-${counter++}`;
                  return (
                    <AccordionItem key={id} value={id}>
                      <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
