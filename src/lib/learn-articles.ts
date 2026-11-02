/** Public educational articles — factual product-aligned content for Motio2edit. */

export type LearnArticle = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  sections: { heading: string; body: string[] }[];
};

export const LEARN_ARTICLES: LearnArticle[] = [
  {
    slug: "ai-photo-restoration",
    title: "How AI Photo Restoration Works",
    description:
      "Learn how Motio2edit restores old, faded, or damaged photos using AI — what restoration can fix, and how to get better results.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "What photo restoration means",
        body: [
          "Photo restoration aims to recover a usable, clearer version of an old or damaged image: reducing scratches, fading, noise, and color loss while keeping people and places recognizable.",
          "Motio2edit approaches restoration as an image-editing task: you upload a photo and request restoration (or use a restoration-oriented entry in Image Tools). The model reconstructs missing or degraded areas based on surrounding pixels and learned photographic structure.",
        ],
      },
      {
        heading: "What AI can and cannot fix",
        body: [
          "AI often improves mild scratches, dust, soft focus, and faded color. Severe tears, large missing regions, or extreme blur may need multiple passes or remain imperfect.",
          "Identity matters: for portraits, prefer clear prompts that ask to restore quality without changing the person's face. Motio2edit is designed to preserve identity when you describe restoration carefully.",
        ],
      },
      {
        heading: "Practical tips in Motio2edit",
        body: [
          "Start with the highest-resolution scan or photo you have. Use Image Studio or Auto Edit with a restoration-focused instruction, then refine with a second pass if needed.",
          "Compare before and after. If faces shift, regenerate with a clearer “keep identity” instruction. Download watermark-free results on paid plans where supported.",
        ],
      },
    ],
  },
  {
    slug: "improve-old-photos",
    title: "How to Improve Old and Low-Quality Photos",
    description:
      "A practical guide to enhancing old family photos and low-quality images with Motio2edit AI tools.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "Start with the best source",
        body: [
          "Flat, well-lit scans beat phone photos of a print under glare. Crop out heavy borders before uploading when possible.",
          "In Motio2edit, upload to Image Studio or Auto Edit for a one-tap cleanup, then use targeted prompts for color, sharpness, or background tidy-up.",
        ],
      },
      {
        heading: "A simple improvement workflow",
        body: [
          "1) Restore or denoise. 2) Adjust color and exposure with a short prompt. 3) Upscale if you need a larger print or display. 4) Optional: Remove BG or Circle 2edit for local fixes.",
          "Avoid over-sharpening in one step; sequential modest edits usually look more natural.",
        ],
      },
    ],
  },
  {
    slug: "ai-image-upscaling",
    title: "AI Image Upscaling Explained",
    description:
      "What AI upscaling does, when to use it in Motio2edit, and how quality settings relate to resolution.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "Upscaling vs inventing detail",
        body: [
          "Upscaling increases pixel dimensions. AI upscalers estimate plausible detail so enlargements look less soft than simple stretch. They cannot recover true optical detail that never existed in the capture.",
          "Motio2edit Image Studio quality options (such as HD, 2K, 4K where your plan allows) control output resolution for generation and many edit paths. Check the on-screen quote before you generate.",
        ],
      },
      {
        heading: "When to upscale",
        body: [
          "Use upscaling for social posts, larger previews, or print-oriented sizes after you are happy with composition and content.",
          "Upscaling a noisy or heavily compressed source may amplify artifacts — clean or restore first when the photo is damaged.",
        ],
      },
    ],
  },
  {
    slug: "remove-objects-from-photos",
    title: "How to Remove Unwanted Objects from Photos",
    description:
      "Remove photobombers, clutter, and distractions with Motio2edit prompts and Circle 2edit.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "Prompt-based removal",
        body: [
          "In Image Studio, upload the photo and describe what to remove (for example, “remove the trash can on the left, keep the building and sky”). Clear location words help.",
          "Complex backgrounds may need a second pass. Failed jobs are not charged credits in Motio2edit.",
        ],
      },
      {
        heading: "Circle 2edit for precise regions",
        body: [
          "Circle 2edit lets you mark the area to change, then describe the edit. Use it when the object is small or when a global prompt might alter the wrong part of the image.",
          "After generation, preview, download, or continue editing. Free visual results may include a Motio2edit watermark; paid plans support watermark-free downloads where available.",
        ],
      },
    ],
  },
  {
    slug: "circle-to-edit",
    title: "How Circle to Edit Works",
    description:
      "Circle 2edit on Motio2edit: mark a region, describe the change, and keep the rest of the photo stable.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "The idea",
        body: [
          "Circle 2edit is Motio2edit’s region-focused editor: you select an area and instruct a local change — remove, replace, recolor, or clean — while aiming to preserve the unmarked image.",
          "It is useful for object removal, clothing tweaks, and small background fixes without rewriting the whole scene.",
        ],
      },
      {
        heading: "Steps",
        body: [
          "Open Circle 2edit from Image tools, upload a photo, mark the region, write a short instruction, and generate. Review the result, then download, share, or try again.",
          "For product detail, see the in-app About Product guide and Circle info pages linked from the studio.",
        ],
      },
    ],
  },
  {
    slug: "ai-vs-traditional-editing",
    title: "AI Photo Editing vs Traditional Photo Editing",
    description:
      "How AI-assisted editing in Motio2edit differs from manual tools — and when to use each approach.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "Speed and intent",
        body: [
          "Traditional editors excel at pixel-precise control: masks, curves, and layers. AI tools excel at high-level intent: “restore this portrait,” “remove the sign,” “make a 9:16 video from this still.”",
          "Motio2edit combines prompt-driven generation with focused tools (Remove BG, Filters, Circle 2edit, CropMix) so everyday edits need less manual masking.",
        ],
      },
      {
        heading: "Quality and responsibility",
        body: [
          "AI results should be reviewed. For journalism or legal use, verify that the output matches your policy for alteration.",
          "Credits measure usage in Motio2edit; the on-screen quote before Generate is the charge for a successful job.",
        ],
      },
    ],
  },
  {
    slug: "ai-video-editing",
    title: "How to Create and Enhance Videos Using AI",
    description:
      "Use Motio2edit Video Studio for text-to-video, image-to-video, and enhancement — plan limits apply.",
    datePublished: "2026-11-02",
    sections: [
      {
        heading: "Video Studio modes",
        body: [
          "Text-to-video turns a written scene into a short clip. Image-to-video animates a still. Enhancement and related options improve or extend clips depending on what your plan unlocks.",
          "Choose duration, aspect ratio (including 9:16 for vertical social), and quality where offered, then preview before download.",
        ],
      },
      {
        heading: "Credits and access",
        body: [
          "Video features generally require a paid plan on Motio2edit. Credit cost appears in the studio quote before you run a job.",
          "Pair clips with Music Studio tracks when you need a simple soundtrack for social cuts.",
        ],
      },
    ],
  },
];

export function getLearnArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}
