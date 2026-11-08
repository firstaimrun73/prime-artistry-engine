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
          "These are distinct. A tool can process your face to remove a photobomber without claiming ownership of your likeness. A tool can keep a generation history so you can re-open yesterday’s edit without training a foundation model on your private album. Conversely, a free consumer app may be explicit that uploads improve shared models. Reading which bucket a product actually claims is more useful than reacting to slogans alone.",
          "Motio2edit’s public security and privacy pages describe processing as temporary for generation workflows, content as staying tied to your account, and uploads as sent to AI providers only as needed to produce results. They do not claim end-to-end encryption of every media pipeline, and they do not claim that no third party ever sees pixels required to run a model. Honest products state what they do — and what they do not.",
        ],
      },
      {
        heading: "Third-party AI providers and the shared pipeline",
        body: [
          "Most modern image and video products do not run every model on a single private GPU farm owned by the brand you see in the browser. Specialized providers supply generation, upscaling, or video motion. When you press Generate, your request is orchestrated by the product’s backend and may be forwarded to those providers with the minimum payload needed for the job.",
          "That architecture is normal. The privacy question is how the product scopes access, how long intermediate artifacts live, and whether user content is sold or pooled for advertising. Motio2edit states that it does not sell personal content for advertising, that payments are handled by external processors without storing full card numbers on Motio2edit servers, and that account data is owner-scoped. Row-level security and authenticated sessions are part of that control story on the platform side.",
          "Shared responsibility still matters. Platform controls cannot replace strong passwords, careful device security, or judgment about what you upload. A private family photo that must never leave a local machine should not be sent to any cloud AI tool — including Motio2edit — regardless of policy language.",
        ],
      },
      {
        heading: "What “privacy-first” can honestly mean",
        body: [
          "Privacy-first is not the same as zero data. Editing in the cloud requires data movement. Privacy-first is closer to: minimize what is collected, tie content to the account that created it, process for the stated job, avoid selling personal content, and give users paths to access or delete personal data through support channels.",
          "Claims that sound stronger than that — for example that data is always invisible to operators, or that every byte is destroyed the instant a job finishes with no operational exceptions — are hard to verify from the outside and easy to overstate. Motio2edit’s published pages prefer concrete language: temporary processing for generation, content tied to your account, no sale of personal content for advertising, TLS in transit, and owner-restricted access patterns.",
          "For creators comparing tools, useful questions include: Is training on my uploads disclosed? Can I delete account data? Are payments separated from media storage? Is there a clear security or trust page, not only a homepage slogan? Motio2edit links Security, Trust, and Privacy pages from the product so those answers are public product content rather than buried terms alone.",
        ],
      },
      {
        heading: "Deepfakes, consent, and creative responsibility",
        body: [
          "AI image and video tools make it easier to alter faces, swap outfits, or invent motion. That power is useful for restoration, marketing, and entertainment. It is also easy to misuse against people who did not consent. Technical privacy controls on a platform do not replace ethics or local law.",
          "If you edit someone else’s likeness, treat consent as part of the workflow. Journalism, legal evidence, and medical imagery have stricter norms than casual social posts. Review outputs before publishing. Motio2edit, like other AI editors, provides results as-is; the human who downloads and shares remains responsible for how those results are used.",
        ],
      },
      {
        heading: "Practical habits when you upload faces",
        body: [
          "Prefer the minimum image that still lets the tool work — crop out unrelated people when you only need one subject. Use region tools such as Circle 2edit when you want a local change without rewriting the whole scene. Keep an offline master of irreplaceable photos. Sign out of shared devices. Review plan and credit quotes before large batches so you are not surprised by usage.",
          "If you need formal access, correction, or deletion of personal data, Motio2edit directs users to the Support channel described on the Privacy and Trust pages. That path is part of treating privacy as an operational practice, not only a homepage line.",
        ],
      },
      {
        heading: "How Motio2edit frames the tradeoff",
        body: [
          "Motio2edit is a credit-based cloud studio for image, video, and music. Cloud AI implies that media is processed off your device. The product’s stated direction is to keep that processing job-scoped, account-tied, and free of selling personal content for ads — while remaining clear that AI providers receive what is needed to generate results.",
          "That is a deliberate middle ground: powerful tools without pretending the pipeline is magic or that no processor ever touches a frame. For many creators, that honesty is more valuable than absolute-sounding slogans. Your photos. Your creations. Your privacy — within the real constraints of cloud generation, documented in the Security, Trust, and Privacy pages, and reinforced on the pre-login homepage so the mindset is visible before sign-in.",
        ],
      },
      {
        heading: "Further reading on Motio2edit",
        body: [
          "For operational detail, see the Security overview (encryption in transit, account protection, AI processing, payments), the Trust page (access controls, private storage patterns, shared responsibility), and Privacy & Safety (ownership, no marketing resale of personal data, rights-style requests via Support). Feature guides elsewhere on Learn cover restoration, upscaling, object removal, and video workflows without mixing those how-tos into privacy claims.",
          "If you are evaluating Motio2edit specifically for face-sensitive work, start with a low-stakes test image, read the on-screen credit quote, and confirm that the output quality meets your bar before you move family or client archives into the workflow.",
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
