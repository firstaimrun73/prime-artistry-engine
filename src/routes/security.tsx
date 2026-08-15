import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Lock,
  ShieldCheck,
  CreditCard,
  EyeOff,
  Cpu,
  Activity,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — MOTIO2EDIT" },
      {
        name: "description",
        content:
          "How MOTIO2EDIT protects your data: encryption, account protection, secure payments, privacy, AI processing, and monitoring.",
      },
      { property: "og:title", content: "Security — MOTIO2EDIT" },
      {
        property: "og:description",
        content: "Encryption, secure payments, privacy protection, and continuous monitoring.",
      },
    ],
  }),
  component: Security,
});

const SECTIONS = [
  {
    slug: "encryption",
    icon: Lock,
    title: "Data Encryption",
    body: "Data is protected in transit with industry-standard TLS. Sensitive values are not stored in plain text on application servers.",
  },
  {
    slug: "account",
    icon: ShieldCheck,
    title: "Account Protection",
    body: "Authenticated sessions and strong password practices protect access. Each user can only access their own profile and generations.",
  },
  {
    slug: "payments",
    icon: CreditCard,
    title: "Secure Payments",
    body: "Payments are processed by third-party providers. Motio2edit does not store full card numbers.",
  },
  {
    slug: "privacy",
    icon: EyeOff,
    title: "Privacy Protection",
    body: "Your content stays tied to your account. We do not sell your personal content for advertising.",
  },
  {
    slug: "ai-processing",
    icon: Cpu,
    title: "AI Processing Security",
    body: "Uploads are sent to AI providers only as needed to produce results. Processing is temporary for generation workflows.",
  },
  {
    slug: "monitoring",
    icon: Activity,
    title: "Platform Monitoring",
    body: "Systems are monitored for abuse and unusual activity. Rate limiting helps protect the platform and accounts.",
  },
];

function Security() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-12 pb-24 sm:py-16 md:pb-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Security at MOTIO2EDIT</h1>
          <p className="mt-3 text-muted-foreground">Built with privacy and protection at every layer.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {SECTIONS.map(({ slug, icon: Icon, title, body }) => (
            <Link
              key={slug}
              to="/security/$slug"
              params={{ slug }}
              className="flex h-full min-h-[11rem] flex-col rounded-2xl border border-border bg-card p-5 sm:p-6 transition-colors hover:border-primary"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Read more <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Looking for more detail on our practices? Visit our{" "}
          <Link to="/trust" className="text-primary hover:underline">
            Trust &amp; Security
          </Link>{" "}
          page.
        </p>
      </div>
      <Footer />
    </div>
  );
}
