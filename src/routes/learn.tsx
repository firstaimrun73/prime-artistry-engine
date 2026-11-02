import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LEARN_ARTICLES } from "@/lib/learn-articles";
import { pageHead, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/learn")({
  head: () =>
    pageHead({
      title: `Learn — AI Photo & Video Guides | ${SITE_NAME}`,
      description:
        "Guides on AI photo restoration, upscaling, object removal, Circle 2edit, and AI video — practical help from Motio2edit.",
      path: "/learn",
    }),
  component: LearnIndex,
});

function LearnIndex() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Motio2edit Learn</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Guides for AI photo & video editing</h1>
        <p className="mt-3 text-muted-foreground">
          Clear explanations of how Motio2edit tools work — restoration, upscaling, object removal, Circle 2edit,
          and more. No login required to read.
        </p>
        <ul className="mt-10 space-y-4">
          {LEARN_ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                to="/learn/$slug"
                params={{ slug: a.slug }}
                className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <h2 className="text-lg font-semibold text-foreground">{a.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-muted-foreground">
          Also see{" "}
          <Link to="/features" className="text-primary hover:underline">
            Features
          </Link>
          ,{" "}
          <Link to="/faq" className="text-primary hover:underline">
            FAQ
          </Link>
          , and{" "}
          <Link to="/about" className="text-primary hover:underline">
            About Product
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
