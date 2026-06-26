import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { listPublicFeedback, type PublicFeedback } from "@/lib/feedback.functions";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "What our users say — MOTIO2EDIT" },
      { name: "description", content: "Real feedback from real Motio2Edit users." },
    ],
  }),
  component: FeedbackPage,
});

const STARS = (n: number) => "⭐".repeat(n);

export function FeedbackCard({ f }: { f: PublicFeedback }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-lg">{STARS(f.rating)}</div>
      <p className="mt-3 text-sm text-foreground">
        {f.message.length > 150 ? `${f.message.slice(0, 150)}…` : f.message}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{f.userName}</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
          {f.category}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(f.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function FeedbackPage() {
  const fetchFeedback = useServerFn(listPublicFeedback);
  const { data } = useQuery({
    queryKey: ["public-feedback"],
    queryFn: () => fetchFeedback(),
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16">
        <h1 className="text-center text-3xl font-bold text-foreground">What our users say 💬</h1>
        <p className="mt-2 text-center text-muted-foreground">Real feedback from real users</p>

        {data && data.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((f) => (
              <FeedbackCard key={f.id} f={f} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-muted-foreground">
            No feedback yet — be the first to share your thoughts!
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
