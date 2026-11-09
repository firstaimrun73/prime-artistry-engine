import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/advertising")({
  head: () => ({
    meta: [
      { title: "Advertising — MOTIO2EDIT" },
      {
        name: "description",
        content:
          "How Motio2edit may show limited sponsored placements for free-plan experiences, and how that relates to privacy choices.",
      },
      { property: "og:title", content: "Advertising — MOTIO2EDIT" },
      {
        property: "og:description",
        content: "Sponsored placements and privacy choices on Motio2edit.",
      },
    ],
  }),
  component: AdvertisingPolicy,
});

/**
 * Policy reflects the current product code (Direct Link / optional network tags for
 * eligible free signed-in users; AdSense scripts are actively stripped).
 */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Purpose of this page",
    body: "This page explains how Motio2edit may show limited sponsored or partner placements, who may see them, and where to find related privacy controls. It supplements Privacy & Safety and is kept aligned with the product as it ships.",
  },
  {
    title: "What we show today",
    body: "Motio2edit may display a small number of sponsored direct-link cards for eligible free-plan, signed-in users on allowed routes. Paid plans and admin accounts are treated as ad-free for those placements. Public marketing pages do not rely on third-party display-ad networks as a primary experience. We do not place ads inside private generation files you download.",
  },
  {
    title: "Partners and scripts",
    body: "The product includes optional partner integrations that can be enabled for eligible free users (for example a sponsored outbound link, and optional network tags controlled by site settings). Google AdSense / googlesyndication scripts are not used as an active display stack in the current client; disallowed third-party ad artifacts are cleaned up by the app when a visitor is not eligible for ads.",
  },
  {
    title: "Cookies and similar technologies",
    body: "Core product cookies support authentication and preferences. Additional partner technologies, if enabled for an eligible session, may use cookies or similar storage under their own policies. You can control cookies in your browser; blocking some cookies may affect personalization or partner measurement where those partners are active.",
  },
  {
    title: "Paid plans",
    body: "When your account is on a paid plan (or admin), the in-app sponsored placements described above are not shown. Plan status is evaluated on the server-side product rules the app already uses for credits and entitlements.",
  },
  {
    title: "Children",
    body: "Motio2edit is not directed at children under 13 (or the minimum age required in your country). We do not knowingly collect personal information from children for advertising.",
  },
  {
    title: "Your choices",
    body: "You may adjust browser cookie settings, upgrade to a paid plan when available, or contact Support with privacy requests related to personal data we hold. For broader data practices, see Privacy & Safety.",
  },
  {
    title: "Changes and contact",
    body: "We may update this page as products or partners change. Questions: support@motio2edit.com or the Support page. Related documents: Privacy & Safety, Terms of Service, and Security.",
  },
];

function AdvertisingPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Policy</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Advertising</h1>
        <p className="mt-3 text-muted-foreground">
          How limited sponsored placements may appear for free experiences. Last updated 10 November 2026.
        </p>
        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          See also{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy &amp; Safety
          </Link>
          ,{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>
          , and{" "}
          <Link to="/security" className="text-primary hover:underline">
            Security
          </Link>
          .
        </p>
      </div>
      <Footer />
    </div>
  );
}
