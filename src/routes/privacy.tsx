import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Safety — MOTIO2EDIT" },
      { name: "description", content: "How MOTIO2EDIT handles your data, content ownership, AI processing, and payment security." },
      { property: "og:title", content: "Privacy & Safety — MOTIO2EDIT" },
      { property: "og:description", content: "Our data usage, content ownership, and security commitments." },
    ],
  }),
  component: Privacy,
});

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Data usage policy",
    body: "We collect only the information needed to operate your account and process generations — such as your email, prompts, and usage history. We do not sell your personal data.",
  },
  {
    title: "Content ownership",
    body: "You own the content you generate. Outputs created through your account are yours to use, download, and publish, subject to applicable law and the prompts you provide.",
  },
  {
    title: "AI processing disclaimer",
    body: "Generations are produced by AI models and may occasionally be inaccurate or unexpected. AI outputs are provided as-is; please review results before relying on them.",
  },
  {
    title: "Payment security",
    body: "Payments are handled by trusted, PCI-compliant payment processors. We never store your full card details on our servers.",
  },
  {
    title: "No data sharing",
    body: "We do not share your prompts, generated content, or personal information with third parties for marketing. Limited processors (e.g. AI and payment providers) act only to deliver the service.",
  },
  {
    title: "Your rights (GDPR-style)",
    body: "You can request access to, correction of, or deletion of your personal data at any time. Contact us through the Support page to exercise these rights.",
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy &amp; Safety</h1>
        <p className="mt-3 text-muted-foreground">
          This page is maintained by MOTIO2EDIT to explain how we handle your data and content.
        </p>
        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Questions about privacy? Reach us via the{" "}
          <Link to="/support" className="text-primary hover:underline">Support page</Link>.
        </p>
      </div>
      <Footer />
    </div>
  );
}
