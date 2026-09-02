/**
 * Imagine section — post-login homepage showcase.
 * Distinct from Circle 2edit. Cards: image + Download + Share + ⓘ. No Try Now.
 */

export type ImagineSample = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  r2Key: string;
  aspectRatio: string;
  quality: string;
  generationMode: string;
  buildDuration: string;
  sortOrder: number;
  active: boolean;
};

const U = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMAGINE_SAMPLES: ImagineSample[] = [
  {
    id: "img-cinematic-portrait",
    title: "Cinematic portrait",
    description: "Soft key light, shallow depth, film-grade grade.",
    imageUrl: U("photo-1534528741775-53994a69daeb"),
    r2Key: "imagine/samples/cinematic-portrait.jpg",
    aspectRatio: "3:4",
    quality: "High",
    generationMode: "Image · Premium",
    buildDuration: "~10–20s",
    sortOrder: 1,
    active: true,
  },
  {
    id: "img-mountain-dawn",
    title: "Mountain dawn",
    description: "Wide alpine light with volumetric atmosphere.",
    imageUrl: U("photo-1506905925346-21bda4d32df4"),
    r2Key: "imagine/samples/mountain-dawn.jpg",
    aspectRatio: "16:9",
    quality: "High",
    generationMode: "Image · Standard",
    buildDuration: "~8–15s",
    sortOrder: 2,
    active: true,
  },
  {
    id: "img-neon-street",
    title: "Neon street",
    description: "Rain-slick reflections and night urban glow.",
    imageUrl: U("photo-1514565131-fce0801e5785"),
    r2Key: "imagine/samples/neon-street.jpg",
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Image · Premium",
    buildDuration: "~12–22s",
    sortOrder: 3,
    active: true,
  },
  {
    id: "img-studio-product",
    title: "Studio product",
    description: "Clean packshot with controlled speculars.",
    imageUrl: U("photo-1523275335684-37898b6baf30"),
    r2Key: "imagine/samples/studio-product.jpg",
    aspectRatio: "1:1",
    quality: "High",
    generationMode: "Image · Standard",
    buildDuration: "~8–14s",
    sortOrder: 4,
    active: true,
  },
  {
    id: "img-wildlife",
    title: "Wildlife moment",
    description: "Natural habitat, crisp subject separation.",
    imageUrl: U("photo-1474511320723-9a56873867b5"),
    r2Key: "imagine/samples/wildlife.jpg",
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Image · Premium",
    buildDuration: "~10–18s",
    sortOrder: 5,
    active: true,
  },
  {
    id: "img-architecture",
    title: "Architecture study",
    description: "Strong geometry and controlled perspective.",
    imageUrl: U("photo-1487958449943-2429e8be8625"),
    r2Key: "imagine/samples/architecture.jpg",
    aspectRatio: "16:9",
    quality: "High",
    generationMode: "Image · Standard",
    buildDuration: "~8–16s",
    sortOrder: 6,
    active: true,
  },
];

export function getActiveImagineSamples(): ImagineSample[] {
  return IMAGINE_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getImagineSampleById(id: string | null | undefined): ImagineSample | null {
  if (!id) return null;
  return IMAGINE_SAMPLES.find((s) => s.id === id) ?? null;
}

export function resolveImagineMediaUrl(sample: ImagineSample): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: Record<string, string> }).env?.VITE_R2_PUBLIC_URL) ||
    "";
  const cleaned = String(base || "").replace(/\/$/, "");
  if (cleaned && sample.r2Key) return `${cleaned}/${sample.r2Key.replace(/^\//, "")}`;
  return sample.imageUrl;
}
