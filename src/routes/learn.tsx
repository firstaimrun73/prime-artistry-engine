import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LEARN_ARTICLES } from "@/lib/learn-articles";
import { pageHead, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/learn")({
  head: () =>
    pageHead({
      title: `Guides & articles | ${SITE_NAME}`,
      description:
        "Motio2edit guides on AI photo restoration, image-to-video, privacy basics, Circle 2edit, and practical editing workflows.",
      path: "/learn",
    }),
  component: LearnIndex,
});

function LearnIndex() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <header className="sticky top-14 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Motio2edit</p>
            <p className="truncate text-sm font-medium">Guides &amp; articles</p>
          </div>
          <Link
            to="/about"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            About Product
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Learn</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Guides for AI photo &amp; video editing
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Short, practical articles on restoration, image-to-video, workflow tips, and how Motio2edit
          describes account-tied content and generation processing. No login required to read.
        </p>

        <div className="mt-10 grid gap-4">
          {LEARN_ARTICLES.map((a) => (
            <Link
              key={a.slug}
              to="/learn/$slug"
              params={{ slug: a.slug }}
              className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Article</p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">{a.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{a.datePublished}</p>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Product detail:{" "}
          <Link to="/about" className="text-primary hover:underline">
            About Product
          </Link>
          {" · "}
          <Link to="/features" className="text-primary hover:underline">
            Features
          </Link>
          {" · "}
          <Link to="/security" className="text-primary hover:underline">
            Security
          </Link>
          {" · "}
          <Link to="/faq" className="text-primary hover:underline">
            FAQ
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
