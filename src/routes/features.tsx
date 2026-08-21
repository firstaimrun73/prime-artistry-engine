import { createFileRoute, Link } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Wand2, Sparkles, ArrowUpRightSquare, Replace, Smile, Eraser,
  Type, Image as ImageIcon, Film, Clapperboard, Wind, GitBranch,
  Music, Headphones, Radio, SlidersHorizontal, Zap, Gauge,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — MOTIO2EDIT AI Image & Video Editing" },
      { name: "description", content: "Explore MOTIO2EDIT's AI image and video tools: AI edit, enhance, upscale, background replace, face restore, object removal, text-to-video, image-to-video, video enhancement and more." },
      { property: "og:title", content: "Features — MOTIO2EDIT" },
      { property: "og:description", content: "AI-powered image and video editing tools built for peak detail and accuracy." },
    ],
  }),
  component: Features,
});

const IMAGE_FEATURES = [
  { icon: Wand2, title: "AI Edit", desc: "Describe any change in plain words — our intelligence layer expands it into a detailed, identity-preserving edit." },
  { icon: Sparkles, title: "AI Enhance", desc: "Sharper detail, reduced noise and improved clarity while keeping composition and colors intact." },
  { icon: ArrowUpRightSquare, title: "Upscale", desc: "High-fidelity upscaling to recover fine detail and produce crisp, high-resolution output." },
  { icon: Replace, title: "Background Replace", desc: "Swap or restyle backgrounds with natural lighting, shadows and reflections." },
  { icon: Smile, title: "Face Restore", desc: "Restore and refine faces while preserving the exact identity of every person." },
  { icon: Eraser, title: "Object Removal", desc: "Cleanly remove unwanted objects and reconstruct the area so it blends seamlessly." },
];

const VIDEO_FEATURES = [
  { icon: Type, title: "Text to Video", desc: "Turn a written idea into a polished video clip with strong motion and prompt following." },
  { icon: ImageIcon, title: "Image to Video", desc: "Bring a still image to life with natural, cinematic motion." },
  { icon: Film, title: "Video Enhancement", desc: "Upscale and sharpen existing clips with frame-consistent detail." },
  { icon: Clapperboard, title: "Extend Video", desc: "Continue a clip beyond its original length for longer sequences." },
  { icon: Wind, title: "Motion Effects", desc: "Add dynamic motion and camera movement for a premium feel." },
  { icon: GitBranch, title: "Scene Continuation", desc: "Generate connected follow-up scenes that flow from your existing footage." },
];

const MUSIC_FEATURES = [
  { icon: Music, title: "AI Music Generation", desc: "Create original, royalty-free tracks from a single text prompt in seconds." },
  { icon: Film, title: "Cinematic Soundtracks", desc: "Epic, trailer-grade scores built for videos, reels and presentations." },
  { icon: Headphones, title: "Background Music", desc: "Subtle ambient beds that sit perfectly under voiceovers and vlogs." },
  { icon: Radio, title: "Genre & Mood Control", desc: "Lo-fi, EDM, orchestral, hip hop and more — paired with any mood you pick." },
  { icon: Zap, title: "Instant Generation", desc: "Your custom track is previewable and downloadable in under a minute." },
  { icon: Gauge, title: "BPM & Tempo Control", desc: "Dial in the exact tempo from 60 to 180 BPM so the track fits your edit." },
];


function Card({ icon: Icon, title, desc }: { icon: typeof Wand2; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary">
      <Icon className="h-6 w-6 text-primary" />
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Features() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you can create</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            A complete AI studio for images and video — engineered for peak detail, accuracy and a premium finish.
          </p>
          <Button asChild className="mt-6">
            <Link to="/editor">Open the editor</Link>
          </Button>
        </div>

        <section className="mt-14">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Image features</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IMAGE_FEATURES.map((f) => (
              <Card key={f.title} {...f} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Video features</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VIDEO_FEATURES.map((f) => (
              <Card key={f.title} {...f} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Music features</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The AI Music Studio turns a prompt into a finished, downloadable track.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MUSIC_FEATURES.map((f) => (
              <Card key={f.title} {...f} />
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Button asChild variant="outline">
              <Link to="/studio/music">Open Music Studio</Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              <SlidersHorizontal className="mr-1 inline h-3 w-3" />
              Standard and High Quality models available
            </span>
          </div>
        </section>
      </div>

      <FooterAd placement="features" />
      <Footer />
    </div>
  );
}
