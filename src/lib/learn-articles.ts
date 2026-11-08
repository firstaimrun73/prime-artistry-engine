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
    slug: "who-owns-your-face-ai-privacy",
    title: "Faces, Uploads, and AI Image Tools: A Practical Privacy Guide",
    description:
      "How AI photo and video tools use uploads, what temporary processing means, and what Motio2edit states on Security and Privacy — without industry ranking claims.",
    datePublished: "2026-11-08",
    sections: [
      {
        heading: "Why faces need careful handling",
        body: [
          "A face in a photo can identify a person. When you upload a portrait for restoration, style change, or video motion, you are sharing a high-signal image so the tool can complete that job.",
          "Good practice is to separate four ideas: the input needed for generation, temporary processing for that job, retention for account history or support, and any use of content to improve models. Marketing language often mixes these. Clear product pages help you decide what you are comfortable uploading.",
        ],
      },
      {
        heading: "What Motio2edit documents today",
        body: [
          "Motio2edit’s Security and Privacy pages describe content as tied to your account, uploads sent to AI providers only as needed to produce results, and processing as part of generation workflows. Motio2edit uses multiple AI providers for image and video generation depending on the feature and plan path.",
          "Those pages do not claim end-to-end encryption of every media pipeline. For account access, deletion, or support questions, use the Support channel listed on the site.",
        ],
      },
      {
        heading: "Practical tips for creators",
        body: [
          "Prefer photos you have rights to use. For other people’s portraits, get permission before public or commercial edits.",
          "Review outputs before you publish. If a result drifts from the person or product you intended, regenerate with a clearer keep-identity instruction.",
        ],
      },
    ],
  },
  {
    slug: "image-to-video-ai",
    title: "How Image-to-Video AI Works",
    description:
      "Turn a still photo into short motion with Motio2edit Video Studio — what image-to-video can do, and how to plan better clips.",
    datePublished: "2026-11-08",
    sections: [
      {
        heading: "Still frames become motion",
        body: [
          "Image-to-video estimates how a scene might move over a few seconds: camera drift, subject motion, water, wind, or subtle facial dynamics. The still anchors identity and composition; the model invents plausible motion between frames.",
          "In Motio2edit Video Studio, upload a reference image, choose duration and aspect ratio where your plan allows, and generate a short clip. Preview before download and refine with a clearer motion instruction if needed.",
        ],
      },
      {
        heading: "What works best",
        body: [
          "Clear subjects, good lighting, and simple backgrounds usually animate more cleanly than heavy compression, extreme blur, or crowded scenes. Vertical 9:16 and 3:4 frames suit reels; landscape suits cinematic pans.",
          "Prompt for direction — slow push-in, gentle head turn, rippling water — rather than a vague “make it move.” Over-aggressive motion can distort faces or products.",
        ],
      },
    ],
  },
  {
    slug: "responsible-ai-content",
    title: "Creating Responsibly with AI Image and Video Tools",
    description:
      "Practical guidance for Motio2edit users: consent, disclosure, copyright-aware prompts, and reviewing AI outputs before you publish.",
    datePublished: "2026-11-08",
    sections: [
      {
        heading: "Consent and likeness",
        body: [
          "When you upload photos of people, prefer images you have rights to use. For portraits of others, get permission before generating commercial or public edits.",
          "Motio2edit processes uploads to deliver the edit you request. Review outputs so identity and context match what you intended.",
        ],
      },
      {
        heading: "Copyright and third-party brands",
        body: [
          "Avoid prompts that copy protected characters, logos, or exact trademarked designs you do not own. Original composition and generic style descriptions are safer for public sharing.",
          "You are responsible for how you use downloads. Platform acceptable-use rules apply to unlawful or abusive content.",
        ],
      },
    ],
  },
  {
    slug: "ai-editing-workflow-tips",
    title: "A Simple AI Editing Workflow for Better Results",
    description:
      "A step-by-step Motio2edit workflow: start with source quality, restore or clean, then enhance, upscale, or animate — without over-processing.",
    datePublished: "2026-11-08",
    sections: [
      {
        heading: "Start with the best source",
        body: [
          "Higher-resolution, well-lit uploads give models more structure to preserve. Crop heavy borders and remove glare when you can before the first generation.",
          "Use Image Studio or Auto Edit for a first cleanup, then targeted tools (Circle 2edit, Remove BG, upscale) for specific goals.",
        ],
      },
      {
        heading: "Sequence modest edits",
        body: [
          "One clear instruction per pass often beats a long prompt that tries to fix everything. Compare before and after; regenerate if faces or products drift.",
          "Upscale after you are happy with content. Animating a still works best when the still already looks finished.",
        ],
      },
    ],
  },
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
          "Motio2edit approaches restoration as an image-editing task: you upload a photo and request restoration. The model reconstructs missing or degraded areas based on surrounding pixels and learned photographic structure.",
        ],
      },
      {
        heading: "Practical tips",
        body: [
          "Start with the highest-resolution scan you have. Prefer prompts that ask to restore quality without changing identity.",
          "Compare before and after. If faces shift, regenerate with a clearer keep-identity instruction.",
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
