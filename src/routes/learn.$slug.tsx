import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLearnArticle, LEARN_ARTICLES } from "@/lib/learn-articles";
import { articleJsonLd, breadcrumbJsonLd, pageHead, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/learn/$slug")({
  loader: ({ params }) => {
    const article = getLearnArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    if (!article) {
      return pageHead({
        title: `Article | ${SITE_NAME}`,
        description: "Motio2edit learning guide",
        path: "/learn",
      });
    }
    const base = pageHead({
      title: `${article.title} | ${SITE_NAME}`,
      description: article.description,
      path: `/learn/${article.slug}`,
      type: "article",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify([
            articleJsonLd({
              title: article.title,
              description: article.description,
              path: `/learn/${article.slug}`,
              datePublished: article.datePublished,
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Learn", path: "/learn" },
              { name: article.title, path: `/learn/${article.slug}` },
            ]),
          ]),
        },
      ],
    };
  },
  component: LearnArticlePage,
});

function LearnArticlePage() {
  const { article } = Route.useLoaderData();
  const others = LEARN_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <header className="sticky top-14 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link
            to="/learn"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary"
            aria-label="Back to guides"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Motio2edit</p>
            <p className="truncate text-sm font-medium">Article</p>
          </div>
          <Link
            to="/about"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            About Product
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Guide</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{article.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">Updated {article.datePublished}</p>

        <div className="mt-10 space-y-4">
          {article.sections.map((s) => (
            <section
              key={s.heading}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 48)} className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="font-semibold">Try it in Motio2edit</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to open Image Studio, Circle 2edit, Remove BG, and Video Studio with your plan credits.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/auth"
              className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/about"
              className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              About Product
            </Link>
          </div>
        </div>

        {others.length > 0 && (
          <aside className="mt-12">
            <h2 className="text-lg font-semibold">More guides</h2>
            <div className="mt-4 grid gap-3">
              {others.map((a) => (
                <Link
                  key={a.slug}
                  to="/learn/$slug"
                  params={{ slug: a.slug }}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition hover:border-primary/40"
                >
                  {a.title}
                </Link>
              ))}
            </div>
          </aside>
        )}
      </article>
      <Footer />
    </div>
  );
}
