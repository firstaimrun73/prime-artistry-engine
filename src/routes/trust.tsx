import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { ShieldCheck, Lock, KeyRound, Database, Cpu, FileText } from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Security — MOTIO2EDIT" },
      { name: "description", content: "How MOTIO2EDIT protects your account, data, and payments, and the shared responsibilities between our platform and our users." },
      { property: "og:title", content: "Trust & Security — MOTIO2EDIT" },
      { property: "og:description", content: "Security, privacy, and data handling practices for MOTIO2EDIT." },
    ],
  }),
  component: Trust,
});

const CONTROLS: { title: string; body: string; Icon: typeof ShieldCheck }[] = [
  {
    title: "Account protection",
    Icon: KeyRound,
    body: "Accounts are protected by authenticated sign-in. Each user can only access their own profile, generations, and support tickets.",
  },
  {
    title: "Data access controls",
    Icon: Lock,
    body: "Row-level security restricts every record to its owner. Plan and credit balances can only be changed by trusted backend logic, never edited directly by users.",
  },
  {
    title: "Private file storage",
    Icon: Database,
    body: "Uploaded files such as avatars and ticket attachments are stored in private buckets and served through short-lived, access-scoped links.",
  },
  {
    title: "Secure payments",
    Icon: ShieldCheck,
    body: "Payments are handled by trusted, PCI-compliant payment processors. We never store your full card details on our servers.",
  },
  {
    title: "AI processing",
    Icon: Cpu,
    body: "Generations are produced by AI models and processed only to deliver the service you requested. AI outputs are provided as-is — please review results before relying on them.",
  },
  {
    title: "Privacy & your rights",
    Icon: FileText,
    body: "We collect only what we need to run your account and do not sell your personal data. You can request access, correction, or deletion through the Support page.",
  },
];

function Trust() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Trust &amp; Security</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          This page is maintained by MOTIO2EDIT to answer common security and privacy questions about
          the platform. It describes the controls currently in place and the shared responsibility
          between our platform and the practices of account owners. It is editable project content and
          is not an independent certification or audit.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {CONTROLS.map(({ title, body, Icon }) => (
            <section key={title} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="font-semibold">{title}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">Shared responsibility</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We secure the platform, its data access rules, and storage. Account owners are responsible
            for keeping their credentials safe and for the content they generate and upload. Together
            these keep your account and data secure.
          </p>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Have a security or privacy question? Reach us via the{" "}
          <Link to="/support" className="text-primary hover:underline">Support page</Link>, or read our{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy &amp; Safety</Link> page.
        </p>
      </div>
    </div>
  );
}
