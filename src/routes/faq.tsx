import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
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
      { name: "description", content: "Frequently asked questions about MOTIO2EDIT: credits, plans, AI generation, payments, and refunds." },
      { property: "og:title", content: "FAQ — MOTIO2EDIT" },
      { property: "og:description", content: "Answers to common questions about credits, plans, and AI generation." },
    ],
  }),
  component: FAQ,
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is MOTIO2EDIT?",
    a: "MOTIO2EDIT is an AI-powered image and video editing platform. Describe what you want with a prompt and our AI generates and transforms media in seconds.",
  },
  {
    q: "How do credits work?",
    a: "Every generation spends credits. Image generation costs 12 credits and video generation costs 60 credits. Your remaining balance is shown in the header and on your dashboard.",
  },
  {
    q: "Why did I run out of credits?",
    a: "Free accounts start with 50 credits, which is about 4 images. Once they're used up, upgrade to Pro or Studio for a much larger monthly credit allowance.",
  },
  {
    q: "What is the Studio plan?",
    a: "Studio is our premium tier above Pro. It includes the highest monthly credit allocation, the fastest priority queue, and access to the best quality (highest model tier) — built for heavy users and creators.",
  },
  {
    q: "How does AI generation work?",
    a: "You enter a prompt (and optionally upload a reference). Our AI processes it on secure servers and returns a generated result you can preview and download. Paid plans unlock video and priority processing.",
  },
  {
    q: "What payment methods are available?",
    a: "Available methods depend on your currency: Card (Stripe) everywhere, plus UPI and Crypto in supported regions. You can switch currency on the pricing page to see local options.",
  },
  {
    q: "What is your refund policy?",
    a: "Credit purchases and subscriptions are generally non-refundable once credits have been used. If you believe there was a billing error, contact us through the Support page and we'll review it.",
  },
];

function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">Everything you need to know about credits, plans, and generation.</p>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
