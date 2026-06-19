import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  CreditCard,
  EyeOff,
  AlertTriangle,
  ServerCog,
} from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — MOTIO2EDIT" },
      { name: "description", content: "How MOTIO2EDIT protects your data: encryption, account security, secure payments, and privacy controls." },
      { property: "og:title", content: "Security — MOTIO2EDIT" },
      { property: "og:description", content: "Data protection, SSL encryption, secure payments and privacy controls at MOTIO2EDIT." },
    ],
  }),
  component: Security,
});

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: "Data Protection",
    body: "Your prompts, uploads and generated media are stored securely with strict access controls. Data is isolated per account and never sold to third parties.",
  },
  {
    icon: Lock,
    title: "SSL Encryption",
    body: "All traffic between your device and MOTIO2EDIT is encrypted in transit using TLS/SSL. Sensitive data is encrypted at rest on our infrastructure.",
  },
  {
    icon: KeyRound,
    title: "Account Security",
    body: "Authentication is handled by a hardened identity provider. Passwords are salted and hashed, and you can update your password any time from Settings.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    body: "Payments are processed by trusted PCI-DSS compliant providers. We never see or store your full card details on our servers.",
  },
  {
    icon: EyeOff,
    title: "Privacy Controls",
    body: "You own your generations. You can review, download and delete your content, and request account deletion at any time.",
  },
  {
    icon: ServerCog,
    title: "Platform Security Practices",
    body: "We apply least-privilege access, row-level database security, audited dependencies, and continuous monitoring to keep the platform safe and reliable.",
  },
];

function Security() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Security</h1>
        <p className="mt-3 text-muted-foreground">
          How we protect your account, your content, and your payments.
        </p>

        <div className="mt-10 grid gap-5">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-6">
              <s.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-semibold">{s.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-primary" /> Report a Security Issue
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Found a vulnerability or suspicious activity? Email us at{" "}
            <a href="mailto:security@motio2edit.com" className="text-primary hover:underline">
              security@motio2edit.com
            </a>{" "}
            or open a high-priority ticket and we'll respond as quickly as possible.
          </p>
          <Button asChild className="mt-4">
            <Link to="/tickets">Report via ticket</Link>
          </Button>
        </section>
      </div>
      <Footer />
    </div>
  );
}
