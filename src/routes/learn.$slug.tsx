import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
      <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link to="/learn" className="hover:text-foreground">
            Learn
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{article.title}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-muted-foreground">{article.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">Updated {article.datePublished} · Motio2edit</p>

        {article.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-xl font-semibold">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 48)} className="mt-3 text-base leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}

        <div className="mt-12 rounded-2xl border border-border bg-card p-5">
          <p className="font-semibold">Try it in Motio2edit</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to open Image Studio, Circle 2edit, Remove BG, and Video Studio with your plan credits.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/auth"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/features"
              className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Features
            </Link>
          </div>
        </div>

        {others.length > 0 && (
          <aside className="mt-12">
            <h2 className="text-lg font-semibold">More guides</h2>
            <ul className="mt-3 space-y-2">
              {others.map((a) => (
                <li key={a.slug}>
                  <Link
                    to="/learn/$slug"
                    params={{ slug: a.slug }}
                    className="text-sm text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>
      <Footer />
    </div>
  );
}
