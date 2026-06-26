import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Image, Video, Download, Zap, Wand2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOTIO2EDIT — AI Image & Video Editor" },
      { name: "description", content: "Upload, prompt, generate and download AI-powered images and videos in seconds." },
      { property: "og:title", content: "MOTIO2EDIT — AI Image & Video Editor" },
      { property: "og:description", content: "Upload, prompt, generate and download AI-powered images and videos in seconds." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" /> Credit-based AI editing
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Transform your media with <span className="text-primary">AI</span>, instantly.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Upload an image or video, write a prompt, and generate a polished result.
          Clean, fast, and built for creators.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/editor">Open editor</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: Image, title: "Image generation", desc: "Available on every plan, including free credits." },
            { icon: Video, title: "Video generation", desc: "Unlock high-quality video on paid plans." },
            { icon: Download, title: "Instant download", desc: "Grab your output the moment it's ready." },
            { icon: Wand2, title: "Prompt-driven", desc: "Describe what you want — no complex tools." },
            { icon: Zap, title: "Priority processing", desc: "Paid plans skip the queue for faster results." },
            { icon: ShieldCheck, title: "Credit-based", desc: "Pay only for what you generate. No surprises." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 text-center">
        <div className="rounded-2xl border border-border bg-card p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to create?</h2>
          <p className="mt-2 text-muted-foreground">Start free, upgrade when you need video.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/pricing">Choose a plan</Link>
          </Button>
        </div>
      </section>
      <HomeTestimonials />
      <Footer />
    </div>
  );
}

function HomeTestimonials() {
  const fetchFeedback = useServerFn(listPublicFeedback);
  const { data } = useQuery({
    queryKey: ["public-feedback", "home"],
    queryFn: () => fetchFeedback(),
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Loved by creators worldwide 🌍</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.slice(0, 6).map((f) => (
          <FeedbackCard key={f.id} f={f} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link to="/feedback">See more feedback</Link>
        </Button>
      </div>
    </section>
  );
}
