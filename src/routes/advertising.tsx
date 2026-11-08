import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/advertising")({
  head: () => ({
    meta: [
      { title: "Advertising & Ads Policy — MOTIO2EDIT" },
      {
        name: "description",
        content:
          "How Motio2edit displays ads, third-party ad partners, cookies, and user choices. Written for transparency and advertising program compliance.",
      },
      { property: "og:title", content: "Advertising & Ads Policy — MOTIO2EDIT" },
      {
        property: "og:description",
        content: "Ads, partners, cookies, and privacy choices on Motio2edit.",
      },
    ],
  }),
  component: AdvertisingPolicy,
});

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Purpose of this page",
    body: "This Advertising & Ads Policy explains how Motio2edit may show advertisements, how third-party ad technology can work on free or ad-supported experiences, and how that relates to your privacy choices. It supplements our Privacy & Safety page and is maintained so visitors and advertising programs can understand our practices.",
  },
  {
    title: "Where ads may appear",
    body: "Ads may appear on public marketing pages and on some free-plan product experiences where the product indicates an ad-supported mode. Paid plans that remove ads will not show those placements when your account is correctly upgraded. We do not place ads inside private generation results you download as your own files.",
  },
  {
    title: "Third-party advertising partners",
    body: "We may work with third-party advertising networks and technology providers (for example Google AdSense or similar partners) to deliver and measure ads. Those partners may use cookies, mobile identifiers, or similar technologies to serve relevant ads, limit how often you see the same ad, and understand aggregate performance. Partner practices are governed by their own policies in addition to ours.",
  },
  {
    title: "Cookies and similar technologies",
    body: "Advertising cookies and similar technologies may store or access information on your device to support ad delivery and measurement. You can control cookies through your browser settings. Blocking some cookies may reduce personalization or cause some features to work less smoothly. For broader data practices, see our Privacy & Safety page.",
  },
  {
    title: "Personalized vs non-personalized ads",
    body: "Depending on your region, consent choices, and partner settings, you may see personalized ads based on interests inferred from activity, or non-personalized ads that rely less on individual profiles (for example contextual or general ads). Where required by law, we aim to respect consent and opt-out mechanisms provided by applicable platforms.",
  },
  {
    title: "Children and restricted audiences",
    body: "Motio2edit is not directed at children under 13 (or the minimum age required in your country). We do not knowingly collect personal information from children for advertising. If you believe a child has provided data inappropriately, contact us through Support so we can take appropriate action.",
  },
  {
    title: "Prohibited content in ads we control",
    body: "When we control ad inventory directly, we do not intentionally run ads that promote illegal activity, malware, or content that clearly violates our acceptable-use standards. Third-party networks apply their own review systems; report problematic ads via Support with a screenshot and URL when possible.",
  },
  {
    title: "Data we share for advertising",
    body: "We do not sell your private generations or account content as an advertising product. Limited technical data needed to operate ad placements (such as page URLs, device type, or approximate location inferred by partners) may be processed by ad technology providers under their terms. Account-tied creative files remain governed by our Privacy & Safety commitments.",
  },
  {
    title: "Your choices",
    body: "You may adjust browser cookie settings, use industry opt-out tools where available, upgrade to an ad-free plan when offered, or contact Support with privacy requests (access, correction, deletion) related to personal data we hold. For Google advertising settings and ad personalization controls, use Google’s published user tools when Google ads are present.",
  },
  {
    title: "Changes and contact",
    body: "We may update this page as products or partners change. Material updates will be reflected by the date on this page when practical. Questions: support@motio2edit.com or the Support page. Related documents: Privacy & Safety, Terms of Service, and Security.",
  },
];

function AdvertisingPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Policy</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Advertising &amp; Ads Policy
        </h1>
        <p className="mt-3 text-muted-foreground">
          Transparency for visitors, creators, and advertising program review. Last updated 8 November
          2026.
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
