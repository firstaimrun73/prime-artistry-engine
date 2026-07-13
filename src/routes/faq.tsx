import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — MOTIO2EDIT" },
      { name: "description", content: "Frequently asked questions about MOTIO2EDIT: account, credits, billing, AI video editing, privacy, security, and subscription plans." },
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
    title: "Account & Login",
    items: [
      { q: "How do I create an account?", a: "Click Sign in, then choose to register with your email and password (or continue with Google). Your account and starter credits are created instantly." },
      { q: "How do I reset my password?", a: "On the sign-in page, use the reset-password link. We'll email you a secure link to set a new password. You can also change it anytime in Settings → Security." },
      { q: "How do I change my email?", a: "Email changes are managed from your account. Contact us through the Support page if you need help transferring your account to a new email." },
    ],
  },
  {
    title: "Credits & Billing",
    items: [
      { q: "How do credits work?", a: "Every generation spends credits. Image generation costs 25 credits and video generation costs 125 credits. Your balance is shown in the header and on your dashboard." },
      { q: "Do credits expire?", a: "Monthly plan credits refresh with each billing cycle. Starter credits on the Free plan do not expire until used." },
      { q: "Can I buy additional credits?", a: "Yes — upgrade to a higher plan for a larger monthly allowance. Additional one-off credit top-ups can be requested through Support." },
      { q: "What payment methods are supported?", a: "Credit / Debit Card (processed securely via Razorpay) and Crypto (USDT, BTC, ETH). Card payments are charged in INR." },
    ],
  },
  {
    title: "AI Video Editing",
    items: [
      { q: "What file formats are supported?", a: "Common image formats (JPG, PNG, WEBP) and standard video formats are supported for upload and generation." },
      { q: "How long does rendering take?", a: "Most images render in seconds. Videos take longer depending on length and quality. Paid plans use a priority queue for faster processing." },
      { q: "What is the maximum upload size?", a: "Uploads are limited to keep processing fast and reliable. If you hit a limit, try compressing your file or upgrading your plan." },
      { q: "Can I edit videos multiple times?", a: "Yes — you can re-edit and regenerate as many times as you like, as long as you have credits available." },
    ],
  },
  {
    title: "AI Image Editing",
    items: [
      { q: "How do I edit an image with AI?", a: "Upload an image in the editor, describe the change you want in the prompt, and generate. You can refine the result with follow-up prompts." },
      { q: "What image formats can I upload?", a: "JPG, PNG, and WEBP are supported. For best results, use high-resolution source images." },
      { q: "Can I remove or replace backgrounds?", a: "Yes — describe the change in your prompt (e.g. 'remove background' or 'replace with a studio backdrop') and generate." },
      { q: "How many credits does image editing use?", a: "Image generation costs 12 credits per result. Your balance updates instantly after each generation." },
    ],
  },
  {
    title: "Payments",
    items: [
      { q: "What payment methods are accepted?", a: "Credit / Debit Card (processed securely via Razorpay) and Crypto (USDT, BTC, ETH). Card payments are charged in INR." },
      { q: "Is my payment information secure?", a: "Yes. Payments are handled by PCI-DSS compliant processors. We never see or store your full card details." },
      { q: "When am I charged?", a: "Paid plans are billed at the start of each billing cycle. You can view your plan and billing details in Settings." },
      { q: "Will my subscription renew automatically?", a: "Yes — plans renew automatically until you cancel. You keep access until the end of the current period after cancelling." },
    ],
  },
  {
    title: "Security & Privacy",
    items: [
      { q: "Is my content private?", a: "Yes. Your content stays private to your account and is never shared publicly without your action." },
      { q: "Are files encrypted?", a: "Yes — data is encrypted in transit and at rest using industry-standard encryption." },
      { q: "Is my data shared with third parties?", a: "We do not sell your data. Files are only processed by trusted infrastructure required to deliver generations." },
      { q: "How secure is Motio2Edit?", a: "We use encryption, secure payments, restricted access, and continuous monitoring. See the Security page for full details." },
    ],
  },
  {
    title: "Refunds",
    items: [
      { q: "What is your refund policy?", a: "Refunds are reviewed case by case. If you experienced a billing error or a technical issue, contact us and we'll make it right." },
      { q: "How do I request a refund?", a: "Open a ticket from the Tickets page with the Billing category, or email support@motio2edit.com with your account details." },
      { q: "Are used credits refundable?", a: "Credits already spent on completed generations are generally non-refundable, but reach out if something went wrong." },
    ],
  },
  {
    title: "API & Integrations",
    items: [
      { q: "Does Motio2Edit offer an API?", a: "API access is on our roadmap. Contact Support to register your interest and be notified when it launches." },
      { q: "Can I integrate Motio2Edit with other tools?", a: "Integrations are planned. For now, you can download your generated assets and use them anywhere." },
      { q: "Is there a commercial usage license?", a: "Higher-tier plans include broader usage rights. See the pricing page or contact Support for licensing questions." },
    ],
  },
  {
    title: "Subscription Plans",
    items: [
      { q: "What happens if I cancel?", a: "You keep access until the end of your current billing period, after which your account returns to the Free plan." },
      { q: "Can I upgrade my plan?", a: "Yes — upgrade anytime from the Pricing page. Your new credit allowance applies immediately." },
      { q: "Can I downgrade my plan?", a: "Yes — you can downgrade, and the change takes effect at the start of your next billing cycle." },
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
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
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
      <Footer />
    </div>
  );
}
