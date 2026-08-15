import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/security/$slug")({
  head: ({ params }) => {
    const page = PAGES[params.slug];
    return {
      meta: [
        { title: page ? `${page.title} — Security — MOTIO2EDIT` : "Security — MOTIO2EDIT" },
        { name: "description", content: page?.summary ?? "Motio2edit security practices." },
      ],
    };
  },
  component: SecurityDetail,
});

type Detail = {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
};

/** Claims stay aligned with product architecture — no invented encryption marketing. */
const PAGES: Record<string, Detail> = {
  encryption: {
    title: "Data Encryption",
    summary: "How Motio2edit protects data in transit and storage practices.",
    sections: [
      {
        heading: "In transit",
        body: "Connections to the Motio2edit web application use HTTPS/TLS so data exchanged between your browser and our services is encrypted in transit.",
      },
      {
        heading: "Application storage",
        body: "Account and generation metadata are stored in our database infrastructure. Sensitive credentials are handled by the authentication provider; we do not store passwords in plain text.",
      },
      {
        heading: "What we do not claim",
        body: "We do not market vague labels such as military-grade or zero-knowledge encryption. Security practices match the actual stack: TLS, authenticated access, and provider-managed storage controls.",
      },
    ],
  },
  account: {
    title: "Account Protection",
    summary: "How sign-in and account access are protected.",
    sections: [
      {
        heading: "Authentication",
        body: "Accounts require sign-in through the configured authentication system (email/password and/or social providers where enabled). Sessions are required to access private routes such as the editor history and dashboard.",
      },
      {
        heading: "Access isolation",
        body: "Each signed-in user can only load their own profile data and generation records. Server-side checks enforce ownership for sensitive actions.",
      },
      {
        heading: "Your responsibilities",
        body: "Use a unique password and keep login details private. You can change your password from Settings when signed in.",
      },
    ],
  },
  payments: {
    title: "Secure Payments",
    summary: "How checkout and billing details are handled.",
    sections: [
      {
        heading: "Processors",
        body: "Card and crypto payments are processed by third-party providers configured for Motio2edit (for example Razorpay, PayPal, or crypto processors depending on currency and method).",
      },
      {
        heading: "Card data",
        body: "Full card numbers are entered on the payment provider’s flows. Motio2edit does not store full card numbers on its application servers.",
      },
      {
        heading: "Plan records",
        body: "After a successful payment, plan and credit updates are applied through server-side payment verification — not by trusting the browser alone.",
      },
    ],
  },
  privacy: {
    title: "Privacy Protection",
    summary: "How your content and account data are treated.",
    sections: [
      {
        heading: "Your content",
        body: "Generations and uploads associated with your account remain private to your account views. We do not sell your creative content for advertising.",
      },
      {
        heading: "Sharing",
        body: "Content is only shared when you download or publish it yourself, or when required to process a generation through AI infrastructure partners.",
      },
      {
        heading: "More detail",
        body: "See the Privacy policy and Trust pages for policy language that governs legal processing of personal data.",
      },
    ],
  },
  "ai-processing": {
    title: "AI Processing Security",
    summary: "What happens when you generate or edit with AI.",
    sections: [
      {
        heading: "Processing purpose",
        body: "When you generate or edit, the application sends the required inputs (such as prompts and uploaded media) to AI providers so a result can be produced.",
      },
      {
        heading: "Temporary processing",
        body: "Provider processing is used to complete the requested generation. Motio2edit stores generation records and outputs needed for your history and downloads according to product design.",
      },
      {
        heading: "Honest limits",
        body: "We do not claim that inputs are never processed by third-party AI systems — that is how cloud generation works. Use the product only with content you have rights to process.",
      },
    ],
  },
  monitoring: {
    title: "Platform Monitoring",
    summary: "How the platform is protected from abuse.",
    sections: [
      {
        heading: "Operational monitoring",
        body: "Infrastructure and application health are monitored so outages and unusual patterns can be investigated.",
      },
      {
        heading: "Abuse prevention",
        body: "Rate limits, credit checks, and authentication reduce automated abuse and unauthorized use of generation endpoints.",
      },
      {
        heading: "Account safety",
        body: "If you suspect unauthorized access, change your password and contact Support with your account email.",
      },
    ],
  },
};

function SecurityDetail() {
  const { slug } = Route.useParams();
  const page = PAGES[slug];
  if (!page) throw notFound();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-12 pb-24 sm:py-16 md:pb-16">
        <Link to="/security" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          ← Security overview
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{page.title}</h1>
        <p className="mt-2 text-muted-foreground">{page.summary}</p>
        <div className="mt-8 space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold">{s.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </div>
  );
}
