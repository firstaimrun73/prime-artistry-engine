/**
 * Music brief — structured atmosphere / mood used to drive generation.
 *
 * This is NOT a claim of objective emotion detection.
 * Labels: detected mood / visual atmosphere / inferred emotional tone.
 */

export type MusicBrief = {
  emotion: string;
  energy: number; // 0–1
  tempo: "slow" | "medium" | "fast";
  mood: string[];
  genre: string;
  instrumentation: string[];
  vocalStyle: string | null;
  production: string;
  intensity: number; // 0–1
  /** Free-text summary for the model prompt */
  summaryPrompt: string;
  /** What modalities contributed */
  sources: Array<"text" | "image" | "video" | "audio">;
};

const GENRE_HINTS: Array<{ re: RegExp; genre: string; instruments: string[] }> = [
  { re: /wedding|romantic|love|couple/i, genre: "romantic ballad", instruments: ["piano", "strings", "soft guitar"] },
  { re: /sport|race|action|energetic|hype/i, genre: "electronic anthem", instruments: ["synth", "drums", "bass"] },
  { re: /sunset|calm|peaceful|nature|ocean/i, genre: "cinematic ambient", instruments: ["piano", "pads", "soft strings"] },
  { re: /nostalgic|childhood|memory|old|vintage/i, genre: "cinematic acoustic", instruments: ["piano", "acoustic guitar", "strings"] },
  { re: /dark|horror|tense|thriller/i, genre: "dark cinematic", instruments: ["low strings", "synth drones", "percussion"] },
  { re: /party|club|dance|edm/i, genre: "dance electronic", instruments: ["synth", "drums", "bass"] },
];

/**
 * Build a music brief from text and optional soft signals (no external vision API required).
 * Image/video URLs are recorded as sources; richer vision analysis can extend this later
 * without changing the brief shape.
 */
export function buildMusicBrief(input: {
  text?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  preferredGenre?: string;
  preferredMood?: string;
  instrumental?: boolean;
}): MusicBrief {
  const text = (input.text || "").trim();
  const sources: MusicBrief["sources"] = [];
  if (text) sources.push("text");
  if (input.imageUrl) sources.push("image");
  if (input.videoUrl) sources.push("video");
  if (input.audioUrl) sources.push("audio");

  let genre = input.preferredGenre || "cinematic ambient";
  let instruments = ["piano", "soft pads"];
  let emotion = input.preferredMood || "reflective";
  let energy = 0.45;
  let tempo: MusicBrief["tempo"] = "medium";
  let intensity = 0.4;

  for (const h of GENRE_HINTS) {
    if (h.re.test(text)) {
      genre = h.genre;
      instruments = h.instruments;
      if (/energetic|sport|party|dance/i.test(text)) {
        energy = 0.8;
        tempo = "fast";
        intensity = 0.75;
        emotion = "energized";
      } else if (/calm|sunset|peaceful|nostalgic/i.test(text)) {
        energy = 0.3;
        tempo = "slow";
        intensity = 0.3;
        emotion = /nostalgic/i.test(text) ? "nostalgic" : "calm";
      } else if (/dark|tense|horror/i.test(text)) {
        energy = 0.55;
        tempo = "medium";
        intensity = 0.65;
        emotion = "tense";
      } else if (/romantic|wedding|love/i.test(text)) {
        energy = 0.35;
        tempo = "slow";
        intensity = 0.35;
        emotion = "romantic";
      }
      break;
    }
  }

  if (input.videoUrl && !text) {
    emotion = "cinematic";
    genre = "cinematic score";
    instruments = ["orchestra", "soft percussion"];
    energy = 0.5;
  }
  if (input.imageUrl && !text && !input.videoUrl) {
    emotion = "atmospheric";
    genre = "ambient cinematic";
  }

  const mood = [emotion, tempo === "slow" ? "warm" : tempo === "fast" ? "driving" : "balanced"];
  const vocalStyle = input.instrumental ? null : "gentle natural vocal";

  const summaryPrompt = [
    text || "Create music matching the provided visual/audio atmosphere",
    `inferred emotional tone: ${emotion}`,
    `genre: ${genre}`,
    `tempo: ${tempo}`,
    `energy: ${energy.toFixed(2)}`,
    `instruments: ${instruments.join(", ")}`,
    input.instrumental ? "instrumental only, no vocals" : "may include natural vocals if appropriate",
    "professional mix, high fidelity, no speech artifacts",
  ].join(". ");

  return {
    emotion,
    energy,
    tempo,
    mood,
    genre,
    instrumentation: instruments,
    vocalStyle,
    production: "warm modern",
    intensity,
    summaryPrompt: summaryPrompt.slice(0, 900),
    sources,
  };
}
