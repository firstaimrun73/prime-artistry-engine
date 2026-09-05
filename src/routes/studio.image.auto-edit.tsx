/**
 * Temporary placeholder — keeps the production build green.
 * Full Maluto AI page restored in a follow-up commit.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/studio/image/auto-edit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Maluto AI Auto Edit — Motio2edit" },
      {
        name: "description",
        content: "Maluto AI Auto Edit is temporarily unavailable. Please try again shortly.",
      },
    ],
  }),
  component: AutoEditPlaceholderPage,
});

function AutoEditPlaceholderPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Auto Edit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Maluto AI is coming back shortly. The rest of the site is available as usual.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
