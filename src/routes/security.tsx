import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import {
  Lock,
  ShieldCheck,
  CreditCard,
  EyeOff,
  Cpu,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — MOTIO2EDIT" },
      { name: "description", content: "How MOTIO2EDIT protects your data: encryption, account protection, secure payments, privacy, AI processing security, and continuous monitoring." },
      { property: "og:title", content: "Security — MOTIO2EDIT" },
      { property: "og:description", content: "Encryption, secure payments, privacy protection, and continuous monitoring." },
    ],
  }),
  component: Security,
});

const SECTIONS = [
  {
    icon: Lock,
    title: "Data Encryption",
    body: "Your data is protected in transit and at rest with industry-standard encryption (TLS in transit, AES at rest). Sensitive information is never stored in plain text.",
  },
  {
    icon: ShieldCheck,
    title: "Account Protection",
    body: "We enforce strong password requirements and secure session handling. We recommend using a unique, long password and keeping your login credentials private.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    body: "All payments are processed through trusted, PCI-DSS compliant providers. We never see or store your full card details — checkout is handled by the payment processor.",
  },
  {
    icon: EyeOff,
    title: "Privacy Protection",
    body: "Your content stays private to your account. We do not sell your data, and access is restricted so no unauthorized party can view your projects.",
  },
  {
    icon: Cpu,
    title: "AI Processing Security",
    body: "Uploaded files are handled securely and processed temporarily for generation. Inputs are not used to train public models without consent.",
  },
  {
    icon: Activity,
    title: "Platform Monitoring",
    body: "Our systems are continuously monitored for suspicious activity. Automated abuse-prevention and rate limiting protect the platform and your account.",
  },
];

function Security() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Security at MOTIO2EDIT</h1>
          <p className="mt-3 text-muted-foreground">Built with privacy and protection at every layer.</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Looking for more detail on our practices? Visit our{" "}
          <Link to="/trust" className="text-primary hover:underline">Trust &amp; Security</Link> page.
        </p>
      </div>
    </div>
  );
}
