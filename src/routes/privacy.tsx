import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Safety — MOTIO2EDIT" },
      {
        name: "description",
        content:
          "How Motio2edit handles your data, content ownership, AI processing, limited provider sharing, and payments.",
      },
      { property: "og:title", content: "Privacy & Safety — MOTIO2EDIT" },
      {
        property: "og:description",
        content: "Account data, AI job processing, and how Motio2edit treats your creative content.",
      },
    ],
  }),
  component: Privacy,
});

/**
 * Policy language distinguishes three different activities:
 * 1) Processing content to complete an AI generation job
 * 2) Storing results for the user’s account history
 * 3) Training AI models
 *
 * Motio2edit does not use customer uploads, prompts, or generations to train its own models.
 * Jobs are sent to infrastructure partners (e.g. fal.ai for media generation; Anthropic API for
 * limited text/analysis helpers) only as needed to deliver the requested service.
 */
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
    title: "AI job processing (not the same as training)",
    body: "When you run an edit or generation, Motio2edit sends the inputs required for that job — such as a prompt and any uploaded media — to AI infrastructure partners so the result can be produced. That processing exists to complete the service you requested. It is separate from keeping results in your account history, and separate from training AI models.",
  },
  {
    title: "Account history",
    body: "Generation records and outputs needed for your workspace, downloads, and history stay associated with your Motio2edit account so you can revisit your work. That storage is for your product experience — not for training models.",
  },
  {
    title: "AI model training",
    body: "Your content is not used to train AI models by Motio2edit. We do not build or fine-tune Motio2edit models on your uploads, prompts, or generations. Limited processors may retain or process job inputs under their own terms solely to deliver inference and operate their platforms; Motio2edit’s product commitment is that we do not use your content for our model training.",
  },
  {
    title: "AI processing disclaimer",
    body: "Generations are produced by AI models and may occasionally be inaccurate or unexpected. AI outputs are provided as-is; please review results before relying on them.",
  },
  {
    title: "Limited sharing with service providers",
    body: "We do not sell your prompts, generated content, or personal information for third-party marketing. To run the product we share only what is needed with service providers acting on our behalf — for example AI infrastructure partners that perform generation jobs, authentication and database providers, email delivery, and payment processors. Those providers process data to deliver the requested service under their agreements with us, not to market your creative work.",
  },
  {
    title: "Payment security",
    body: "Payments are handled by trusted payment processors. We never store your full card details on our application servers.",
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
          How Motio2edit handles your data, creative content, and AI processing. Last reviewed 10
          November 2026.
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
          Questions about privacy? Reach us via the{" "}
          <Link to="/support" className="text-primary hover:underline">
            Support page
          </Link>
          . Related:{" "}
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
