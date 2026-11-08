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
    title: "Who Owns Your Face in the Age of AI? The Hidden Privacy Risks Behind AI Image and Video Generation",
    description:
      "An educational guide to how AI photo and video tools handle faces, uploads, retention, third-party processing, and your rights — and how Motio2edit approaches privacy without overclaiming.",
    datePublished: "2026-11-08",
    sections: [
      {
        heading: "Why faces feel different from other pixels",
        body: [
          "A face is not just another region of an image. It is biometric-adjacent information: it can identify you, link you across apps, and — when combined with other data — support profiling or impersonation. When you upload a selfie or a family portrait to an AI editor, you are not only asking for a better crop or a cleaner background. You are handing a service a high-signal representation of a person.",
          "That does not mean every AI tool is misusing faces. It does mean that privacy-minded creators should understand the difference between generation inputs, temporary processing, long-term retention, and model training. Those four buckets are often mixed together in marketing language. Separating them is the first step toward informed use.",
        ],
      },
      {
        heading: "Generation inputs vs retention vs training",
        body: [
          "Generation input is the photo, mask, or prompt required to produce a result. Without that input, the job cannot run. Temporary processing means the provider receives what it needs for that job and is not expected to keep the material as a permanent product dataset. Retention means the platform keeps copies — for history, re-download, support, abuse review, or product analytics — for some period under its own rules. Training means content may be used to improve models that serve many users, not only your account.",
          "Motio2edit’s public security and privacy pages describe processing as temporary for generation workflows, content as staying tied to your account, and uploads as sent to AI providers only as needed to produce results. They do not claim end-to-end encryption of every media pipeline.",
        ],
      },
      {
        heading: "What privacy-first can honestly mean",
        body: [
          "Privacy-first is not the same as zero data. Editing in the cloud requires data movement. Privacy-first is closer to: minimize what is collected, tie content to the account that created it, process for the stated job, avoid selling personal content, and give users paths to access or delete personal data through support channels.",
          "For creators comparing tools, useful questions include: Is training on my uploads disclosed? Can I delete account data? Are payments separated from media storage?",
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
          "Image-to-video models estimate how a scene might move over a few seconds: camera drift, subject motion, water, wind, or subtle facial dynamics. The still image anchors identity and composition; the model invents plausible motion between frames.",
          "In Motio2edit Video Studio, you upload a reference image, choose duration and aspect ratio where your plan allows, and generate a short clip. Preview before download and refine with a clearer motion instruction if needed.",
        ],
      },
      {
        heading: "What works best",
        body: [
          "Clear subjects, good lighting, and simple backgrounds usually animate more cleanly than heavy compression, extreme blur, or crowded scenes. Vertical 9:16 and 3:4 frames suit reels; landscape suits cinematic pans.",
          "Prompt for direction: “slow push-in,” “gentle head turn,” “rippling water,” rather than vague “make it move.” Over-aggressive motion can distort faces or products.",
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
    ],
  },
];

export function getLearnArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}
