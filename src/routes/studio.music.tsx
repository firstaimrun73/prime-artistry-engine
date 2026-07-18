import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Music, Sparkles } from "lucide-react";

export const Route = createFileRoute("/studio/music")({
  head: () => ({
    meta: [
      { title: "Music Studio — MOTIO2EDIT" },
      { name: "description", content: "AI music generation — text-to-music, moods, loops and sound design. Coming soon." },
      { property: "og:title", content: "Music Studio — MOTIO2EDIT" },
      { property: "og:description", content: "AI music generation — text-to-music, moods, loops and sound design. Coming soon." },
    ],
  }),
  component: MusicStudio,
});

const MOODS = [
  "Cinematic", "Lo-fi", "EDM", "Rock", "Classical", "Jazz",
  "Ambient", "Orchestra", "Epic Trailer", "Game", "Podcast Intro", "Loop",
];

function MusicStudio() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link to="/studio" className="text-xs font-medium text-muted-foreground hover:text-foreground">← All studios</Link>
        <div className="mt-4 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-background/60 p-2.5">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Music <span className="text-primary">Studio</span></h1>
              <p className="text-sm text-muted-foreground">AI music generation is on the way.</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Coming soon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We're wiring up text-to-music, mood generation, loops, and stem separation.
              Turn on notifications from your account to hear about it first.
            </p>
          </div>

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Planned moods & styles</h2>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <span key={m} className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
