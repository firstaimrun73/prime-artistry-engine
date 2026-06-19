import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MOTIO2EDIT" },
      { name: "description", content: "The terms and conditions for using MOTIO2EDIT's AI image and video editing platform." },
      { property: "og:title", content: "Terms of Service — MOTIO2EDIT" },
      { property: "og:description", content: "Terms and conditions for using MOTIO2EDIT." },
    ],
  }),
  component: Terms,
});

const SECTIONS: { title: string; body: string }[] = [
  { title: "1. Acceptance of terms", body: "By creating an account or using MOTIO2EDIT, you agree to these Terms of Service. If you do not agree, please do not use the platform." },
  { title: "2. Your account", body: "You are responsible for keeping your login credentials secure and for all activity that happens under your account. Notify us immediately of any unauthorized use." },
  { title: "3. Credits & billing", body: "Generations consume credits. Paid plans renew on a recurring billing cycle until cancelled. You can manage or cancel your plan at any time from the pricing page." },
  { title: "4. Acceptable use", body: "You may not use MOTIO2EDIT to create unlawful, harmful, infringing, or abusive content. We may suspend accounts that violate these rules." },
  { title: "5. Content ownership", body: "You retain ownership of the content you upload and generate, subject to the rights you grant us to process and deliver your generations." },
  { title: "6. Refunds", body: "Refunds are handled in line with our refund guidelines. Reach out through the Support Center to request a refund review." },
  { title: "7. Changes to the service", body: "We may update features, pricing, and these terms over time. Continued use after changes take effect constitutes acceptance of the updated terms." },
  { title: "8. Contact", body: "Questions about these terms? Contact us at support@motio2edit.com." },
];

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-muted-foreground">Please read these terms carefully before using MOTIO2EDIT.</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
