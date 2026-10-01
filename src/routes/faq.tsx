import { createFileRoute } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Motio2edit" },
      {
        name: "description",
        content:
          "Frequently asked questions about Motio2edit image, video, and music AI tools.",
      },
    ],
  }),
  component: FAQ,
});

type QA = { q: string; a: string };
type Category = { title: string; items: QA[]; visible?: boolean };

/**
 * Public FAQ data.
 * Categories with visible === false are preserved in source but hidden from
 * the page and from search (e.g. Lenses while the product feature is offline).
 */
const CATEGORIES: Category[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: "What is Motio2edit?",
        a: "Motio2edit is an AI-powered creative workspace for creating, editing, enhancing, and transforming images, videos, and music through dedicated tools and studios.",
      },
      {
        q: "How do I get started?",
        a: "Choose a tool or studio, upload media when needed, describe what you want (or use a one-tap tool like Auto Edit), generate or apply the edit, then preview, download, or share the result.",
      },
      {
        q: "Do I need an account?",
        a: "Yes. Sign in or create a free account with email and password or Google to use the studios, save results, and manage credits. You can browse public pages without signing in.",
      },
      {
        q: "What is the + button on mobile?",
        a: "On mobile, the center + tab opens Auto Edit — a one-tap photo improvement tool so you can enhance a photo without writing a prompt.",
      },
      {
        q: "Where can I find my creations?",
        a: "Open History from the app navigation. Successful eligible generations can appear there. Free accounts have limited History access and shorter temporary availability for results; paid plans unlock full History browsing, download, and edit-again from saved items.",
      },
      {
        q: "How do I create an account?",
        a: "Tap Sign in, then register with email and password or continue with Google. Your account is created when signup completes, and you receive starter credits on the Free plan.",
      },
    ],
  },
  {
    title: "Image Studio",
    items: [
      {
        q: "What is Image Studio?",
        a: "Image Studio is Motio2edit’s workspace for generating new images from text and editing existing photos with prompts, quality options, aspect ratios, and optional reference images.",
      },
      {
        q: "Can I create an image from text?",
        a: "Yes. Open Image Studio or the editor, leave the canvas without an upload (or choose text-to-image), describe the scene, pick quality and aspect ratio, and generate.",
      },
      {
        q: "Can I edit an existing image?",
        a: "Yes. Upload a photo, describe the change you want, and generate. You can also open specialized tools (such as Circle 2edit, Remove Background, or Auto Edit) from Image Studio or Image Tools.",
      },
      {
        q: "What are Standard, Premium, and Ultra AI?",
        a: "They are Image Studio experiences. Standard is the everyday path. Premium unlocks higher quality and more reference capacity. Ultra AI is the top experience for maximum fidelity. Your plan controls which experiences you can use.",
      },
      {
        q: "What is the difference between Standard, Premium, and Ultra AI?",
        a: "Standard suits everyday edits and generation. Premium adds higher quality options and more reference images. Ultra AI is available on higher plans for the highest fidelity output your plan allows.",
      },
      {
        q: "What quality options are available?",
        a: "Available quality options depend on the experience and your plan. The UI only shows options that are supported for the experience you selected.",
      },
      {
        q: "What aspect ratios are supported?",
        a: "Common ratios such as 1:1, 4:3, 16:9, 9:16, and 3:4 are available where the experience supports them. Only ratios shown in the UI for your selected experience are offered.",
      },
      {
        q: "Can I use reference images?",
        a: "Yes. You can upload a primary image and, on eligible plans, additional reference images to guide the result. The first selected image is primary; others act as references.",
      },
      {
        q: "How many reference images can Free use?",
        a: "Free accounts are limited to a single image (one primary, no multi-reference). Multiple references require a paid plan.",
      },
      {
        q: "How do multiple reference images work?",
        a: "On paid plans, you can select additional images as references. Limits depend on the experience (for example Standard vs Premium/Ultra) and your plan. The quote before Generate reflects the images actually selected.",
      },
      {
        q: "Why are multiple references a paid capability?",
        a: "Multi-reference generation is reserved for paid plans so Free accounts stay simple and single-image focused. Upgrade to unlock more references and higher limits.",
      },
      {
        q: "How are Image Studio credits calculated?",
        a: "Cost depends on experience, whether you have a source image, how many references you send, and quality. The quote shown before Generate matches the settings and images you selected.",
      },
      {
        q: "Does the displayed credit quote match the generation?",
        a: "Yes. The quote shown before you generate is based on your current settings and selected images, and that is what is charged when the job succeeds.",
      },
      {
        q: "What happens if generation fails?",
        a: "An error is shown and you can retry. Failed generations are not charged credits.",
      },
      {
        q: "Can I regenerate?",
        a: "Yes. After a result (or a failure), you can adjust settings or the prompt and generate again. Each successful generation uses credits according to the quote.",
      },
      {
        q: "Can I download and share the result?",
        a: "Yes. Use the download and share controls on the result view. Free visual results include the Motio2edit watermark; paid users can choose watermark behavior where supported.",
      },
      {
        q: "Can I edit again?",
        a: "Yes. From the result or from History (on plans that unlock History), you can open the image again in the editor to continue editing.",
      },
    ],
  },
  {
    title: "Image Editing",
    items: [
      {
        q: "How do I edit an image?",
        a: "Open Image Studio or the Image Editor, upload a photo, describe the change, and generate. You can also start from specialized tools such as Circle 2edit, Auto Edit, Filters, or Remove Background.",
      },
      {
        q: "Can I remove objects?",
        a: "Yes. Describe what to remove in a prompt, or use Circle 2edit to mark the area and describe the change. Complex scenes may need a clearer prompt or a second pass.",
      },
      {
        q: "Can I remove people?",
        a: "Yes. Use a clear prompt or Circle 2edit to mark the person and request removal. Results depend on the photo and surrounding detail.",
      },
      {
        q: "Can I change clothing?",
        a: "Yes. Describe the outfit change in the prompt (or use a clothing-oriented tool entry when available). Identity and background preservation depend on the photo and instruction.",
      },
      {
        q: "Can I restore an old photo?",
        a: "Yes. Use a restoration-oriented entry from Image Tools or describe restoration in the editor prompt (scratches, fade, noise, color).",
      },
      {
        q: "Can I change the background?",
        a: "Yes. Describe the new background in a prompt, or use Remove Background when you need a transparent or clean cutout first.",
      },
      {
        q: "Can I improve or clean up an image?",
        a: "Yes. Use Auto Edit for one-tap enhancement, or describe cleanup (declutter, tidy background, improve quality) in Image Studio.",
      },
      {
        q: "What image formats can I upload?",
        a: "JPG, PNG, and WEBP are supported. Higher-resolution sources generally produce better results.",
      },
      {
        q: "What is the upload size limit?",
        a: "Maximum upload size is about 40 MB per image. If upload fails, try a smaller file or a more common format such as JPG or PNG.",
      },
      {
        q: "Can I preview my uploaded image?",
        a: "Yes. Selected thumbnails can be opened for a larger preview. The active selection still controls which image is primary for generation.",
      },
      {
        q: "What happens when an edit fails?",
        a: "You see an error message and can retry. Credits are not charged for failed jobs.",
      },
    ],
  },
  {
    title: "Circle 2edit",
    items: [
      {
        q: "What is Circle 2edit?",
        a: "Circle 2edit lets you mark or circle an area of an image and describe the desired change. The selected area is edited while the rest of the image is preserved as much as possible.",
      },
      {
        q: "How does Circle 2edit work?",
        a: "Open Circle 2edit, upload a photo, mark the region you want to change, add a short description of the edit, and generate. The tool focuses the change on the marked area.",
      },
      {
        q: "Can I remove an object with Circle 2edit?",
        a: "Yes. Circle the object and describe removal (or use the remove-oriented flow). The system aims to fill the area so the object is gone.",
      },
      {
        q: "Can I replace or change something inside the selected area?",
        a: "Yes. Mark the area and describe what should appear instead — for example a different object, color, or style within that region.",
      },
      {
        q: "Does Circle 2edit require a prompt?",
        a: "Yes. You mark the area and provide a short description of the change so the model knows what to do inside the selection.",
      },
      {
        q: "What happens after I generate?",
        a: "You get a result preview. You can download, share, regenerate, or continue editing depending on the controls shown and your plan.",
      },
      {
        q: "Can I download or share the result?",
        a: "Yes. Use the download and share actions on the result. Free users receive the Motio2edit watermark on eligible visual results.",
      },
    ],
  },
  {
    title: "CropMix",
    items: [
      {
        q: "What is CropMix?",
        a: "CropMix is Motio2edit’s crop workspace for framing photos with free crop tools, presets, and custom ratios.",
      },
      {
        q: "What can I do with CropMix?",
        a: "Upload a photo, choose a crop ratio or free crop, adjust the frame, apply the crop, then preview and download the result.",
      },
      {
        q: "Can I combine, crop, or compose images?",
        a: "CropMix focuses on cropping a single photo with presets and custom ratios. Composition beyond crop depends on what the current CropMix UI offers; use Image Studio when you need AI composition or multi-image generation.",
      },
      {
        q: "Which features are available in the basic experience?",
        a: "Core crop tools, presets, and custom ratios are available after you sign in and upload a photo. AI-tier collage or advanced styles, if shown, may use credits and plan rules.",
      },
      {
        q: "Which parts use AI?",
        a: "Basic crop and export are local framing tools. Any AI-assisted styles or tiers shown in CropMix use credits according to the option you select.",
      },
      {
        q: "Can I preview the result?",
        a: "Yes. After you apply the crop you see an output preview before download or further edits.",
      },
      {
        q: "Can I download the result?",
        a: "Yes. From the output view you can download the cropped image. Watermark rules for Free vs paid apply to eligible visual outputs.",
      },
      {
        q: "Does CropMix save to History?",
        a: "Eligible saved outputs follow the same History rules as other tools. Free History access is limited; paid plans unlock full History.",
      },
    ],
  },
  {
    title: "Filters",
    items: [
      {
        q: "What are Motio2edit Filters?",
        a: "Filters are AI-powered looks you apply to a photo — including categories such as Natural, Portrait, Cinematic, Comic, Sketch, and more — with live preview where supported.",
      },
      {
        q: "How do I apply a filter?",
        a: "Open Filters, upload a photo, browse or search looks, select a filter, preview, then apply and download or share the result.",
      },
      {
        q: "What filter categories or levels are available?",
        a: "Filters are organized by category in the Filters studio. There is a large set of looks split across Common (free), AI+, and Premium tiers.",
      },
      {
        q: "What is AI+ in Filters?",
        a: "AI+ filters are an elevated tier above Common. They require the plan access shown when a filter is locked.",
      },
      {
        q: "What is Premium in Filters?",
        a: "Premium filters are the highest filter tier. Locked Premium looks require the applicable paid plan.",
      },
      {
        q: "Which filters are available to Free users?",
        a: "Free users can use Common (free) filters. AI+ and Premium filters appear locked until you upgrade.",
      },
      {
        q: "What happens when a filter is locked?",
        a: "Locked filters show a lock state and prompt you to upgrade. You can still browse them, but applying them requires the required plan.",
      },
      {
        q: "Can I compare the original and filtered result?",
        a: "Where the Filters UI provides comparison or before/after controls, you can review the original against the filtered look before downloading.",
      },
      {
        q: "Can I restart or reset?",
        a: "Yes. You can clear the selection, pick another filter, or start over with a new upload from the Filters flow.",
      },
      {
        q: "Can I download or share the result?",
        a: "Yes. After applying a filter, use download or share. Free visual results include the Motio2edit watermark.",
      },
      {
        q: "How does watermarking work with Filter results?",
        a: "Eligible Free visual results show the Motio2edit watermark. Paid users can choose to keep or remove the watermark where supported.",
      },
    ],
  },
  {
    title: "Lenses",
    visible: false,
    items: [
      {
        q: "What are Motio2edit Lenses?",
        a: "Lenses are camera-style AI looks you can apply to a photo for distinctive visual effects, organized by category and tier.",
      },
      {
        q: "How do Lenses work?",
        a: "Open Lenses, upload or capture a photo, browse lens looks, preview, apply, then download or share the result.",
      },
      {
        q: "Can I use Lenses like a camera effect?",
        a: "Yes. Lenses are designed as effect looks you apply to a photo, similar to choosing a creative camera style.",
      },
      {
        q: "What Lens categories are available?",
        a: "Lenses are grouped by category in the Lenses studio. Availability of each look depends on Common, AI+, and Premium tiers.",
      },
      {
        q: "What is AI+?",
        a: "AI+ is a mid tier of Lenses above Common. Locked AI+ looks require the applicable paid access.",
      },
      {
        q: "What is Premium?",
        a: "Premium Lenses are the highest tier. They require the applicable paid plan when locked.",
      },
      {
        q: "Which Lenses are available to Free users?",
        a: "Free users can use Common Lenses. AI+ and Premium Lenses remain locked until upgrade.",
      },
      {
        q: "What happens when a Lens is locked?",
        a: "Locked Lenses show a lock state and upgrade prompt. You can browse them but cannot apply them without the required plan.",
      },
      {
        q: "Can I capture or apply a Lens?",
        a: "You can apply a Lens to an uploaded photo. Capture options depend on what the Lenses UI exposes on your device.",
      },
      {
        q: "Can I download or share the result?",
        a: "Yes. After applying a Lens, use download or share. Free visual results include the Motio2edit watermark.",
      },
      {
        q: "Is watermarking applied?",
        a: "Yes for Free users on eligible visual results. Paid users can choose keep or remove where supported.",
      },
    ],
  },
  {
    title: "Frames",
    items: [
      {
        q: "What are Frames?",
        a: "Frames let you place a photo into decorative or styled frame designs — from simple borders to richer framed looks.",
      },
      {
        q: "How do I put a photo into a Frame?",
        a: "Open Frames, upload a photo, browse frame styles, preview how your photo sits in the frame, then apply and download or share.",
      },
      {
        q: "What kinds of Frames are available?",
        a: "Frames are offered in tiers such as Common, AI+, and Premium. Browse the Frames studio to see the current catalog.",
      },
      {
        q: "What is Common?",
        a: "Common frames are the free tier of frame designs available without upgrade.",
      },
      {
        q: "What is AI+?",
        a: "AI+ frames are an elevated tier. Locked AI+ frames require the applicable paid plan.",
      },
      {
        q: "What is Premium?",
        a: "Premium frames are the highest tier and require the applicable paid plan when locked.",
      },
      {
        q: "Which Frames are locked for Free users?",
        a: "AI+ and Premium frames are locked on Free. Common frames remain available.",
      },
      {
        q: "Can I preview a Frame?",
        a: "Yes. Select a frame to preview how your photo appears before applying.",
      },
      {
        q: "Can I download or share the framed image?",
        a: "Yes. After applying a frame, use download or share. Free visual results include the Motio2edit watermark.",
      },
      {
        q: "How does watermarking work?",
        a: "Eligible Free visual outputs show the Motio2edit watermark. Paid users can choose keep or remove where supported.",
      },
    ],
  },
  {
    title: "Auto Edit",
    items: [
      {
        q: "What is Auto Edit?",
        a: "Auto Edit (Maluto AI) is a one-tap enhancement tool: upload one photo and Motio2edit analyzes and improves it without requiring you to write a prompt.",
      },
      {
        q: "How does Auto Edit work?",
        a: "Upload a photo, choose a quality option if offered, and start Auto Edit. The system analyzes the image and applies cleanup and enhancement automatically.",
      },
      {
        q: "Do I need to write a prompt?",
        a: "No. Auto Edit is designed to work without a written prompt.",
      },
      {
        q: "What kind of improvements can Auto Edit make?",
        a: "Typical improvements include cleanup, restoration-style fixes, decluttering, and background tidy-up, depending on what the analyzer detects in your photo.",
      },
      {
        q: "Can I regenerate?",
        a: "Yes. You can run Auto Edit again on the same or another photo. Each successful run uses credits based on the quality selected.",
      },
      {
        q: "Can I download or share the result?",
        a: "Yes. Use the result controls to download or share. Watermark rules for Free vs paid apply to eligible visual results.",
      },
      {
        q: "Does Auto Edit use the same watermark behavior as other generated media?",
        a: "Auto Edit results follow Motio2edit’s visual watermark rules: Free users get the Motio2edit watermark on eligible results; paid users can choose keep or remove where supported.",
      },
      {
        q: "Does Auto Edit appear in History?",
        a: "Successful Auto Edit results can appear in History under the Auto Edit category. Free History access is limited; paid plans unlock full History.",
      },
    ],
  },
  {
    title: "Video Studio",
    items: [
      {
        q: "What is Video Studio?",
        a: "Video Studio creates AI video from text, from an image, or from an existing video, with controls for duration, aspect ratio, resolution, style, and optional audio.",
      },
      {
        q: "Can I create a video from text?",
        a: "Yes. Choose text mode, write a prompt, set duration and other options, and generate. Video Studio requires a plan that unlocks video.",
      },
      {
        q: "Can I use an image as the source?",
        a: "Yes. Choose image mode, upload an image, describe how to animate or transform it, and generate.",
      },
      {
        q: "Can I use a video as the source?",
        a: "Yes. Choose video mode, upload a source video, describe the edit or restyle, and generate.",
      },
      {
        q: "What durations are available?",
        a: "Available durations depend on mode, tier (Standard/Premium), and your plan. Longer durations may require Premium or a higher plan. Only options shown as unlocked in the UI are available.",
      },
      {
        q: "What aspect ratios are supported?",
        a: "Common options include 16:9, 9:16, and 1:1 where the selected mode and tier support them.",
      },
      {
        q: "How does the prompt work?",
        a: "Describe the video, motion, or edit you want. Prompt length limits depend on Standard vs Premium. For image or video modes, the prompt guides how the source is transformed.",
      },
      {
        q: "What styles or options are available?",
        a: "You can choose Standard or Premium, duration, aspect ratio, resolution, optional audio when supported, and a style from the style strip. Some options lock based on plan or tier.",
      },
      {
        q: "What happens when generation fails?",
        a: "An error is shown and you can adjust settings and retry. Failed generations are not charged credits.",
      },
      {
        q: "Can I regenerate?",
        a: "Yes. From the result view you can close and generate again with the same or updated settings.",
      },
      {
        q: "Can I download or share the result?",
        a: "Yes. Use the download controls on the video result. Free users do not have Video Studio access; paid video outputs follow plan watermark rules for visual media.",
      },
      {
        q: "How does watermarking work?",
        a: "Video outputs follow Motio2edit’s visual media watermark policy for your plan. Free accounts cannot access Video Studio; paid users can control watermark where supported.",
      },
      {
        q: "Does Video Studio save to History?",
        a: "Successful videos can appear in History under Videos when History retention is enabled. Paid plans unlock full History access.",
      },
      {
        q: "Who can use Video Studio?",
        a: "Video Studio is available on paid plans (Lite and above). Free accounts see Video as locked and are directed to plans to upgrade.",
      },
    ],
  },
  {
    title: "Music Studio",
    items: [
      {
        q: "What is Music Studio?",
        a: "Music Studio generates music and audio from prompts — including songs and instrumentals — with additional modes and longer tracks on higher plans.",
      },
      {
        q: "Who can use Music Studio?",
        a: "Signed-in users can use Music Studio. Free accounts have limited modes and duration (standard quality, song and instrumental, shorter tracks). Paid plans unlock more modes, longer tracks, and higher quality options.",
      },
      {
        q: "What can I create?",
        a: "Depending on your plan: songs, instrumentals, and on higher plans also background music, voiceover, sound effects, and video-related music modes.",
      },
      {
        q: "Can I create songs?",
        a: "Yes. Song mode is available on Free and paid plans within each plan’s prompt and duration limits.",
      },
      {
        q: "Can I create instrumentals?",
        a: "Yes. Instrumental mode is available on Free and paid plans within each plan’s limits.",
      },
      {
        q: "Can I create voice or other audio content?",
        a: "Voiceover, SFX, and related modes are available on paid plans according to plan capabilities. Free is limited to song and instrumental.",
      },
      {
        q: "Can I use image or video input?",
        a: "Image-to-music and video-to-music style inputs are available on paid plans that enable those capabilities. Free does not include those inputs.",
      },
      {
        q: "How do duration and credits work?",
        a: "Longer tracks and higher quality cost more credits. Your plan sets maximum duration and allowed quality. The UI shows the estimate before you generate.",
      },
      {
        q: "What happens when generation fails?",
        a: "An error is shown and you can retry. Failed jobs are not charged credits.",
      },
      {
        q: "Can I download or share music?",
        a: "Yes. Use the download controls on the track result. Sharing options depend on the controls shown for that result.",
      },
      {
        q: "Does Music Studio use the same watermark as visual media?",
        a: "No. Music outputs are audio and do not use the visual Motio2edit image/video watermark. Visual watermark rules apply to images and videos, not music tracks.",
      },
      {
        q: "Does Music Studio save to History?",
        a: "Yes. Music tracks can appear in the Music section of History when retention is enabled for your account.",
      },
    ],
  },
  {
    title: "Remove Background & Other Tools",
    items: [
      {
        q: "What is Remove Background?",
        a: "Remove Background cuts the subject out of a photo so you can get a clean or transparent background result.",
      },
      {
        q: "How do I use Remove Background?",
        a: "Open Remove Background from Image Tools or Studio, upload a photo, run the tool, then download or continue editing the result.",
      },
      {
        q: "What input does Remove Background require?",
        a: "A single image upload (JPG, PNG, or WEBP within the usual size limits).",
      },
      {
        q: "Can I download or share Remove Background results?",
        a: "Yes. Use the result controls. Free visual results include the Motio2edit watermark where applicable.",
      },
      {
        q: "Does Remove Background save to History?",
        a: "Successful eligible results can appear in History subject to the same Free vs paid History rules.",
      },
      {
        q: "What other AI image tools are available?",
        a: "Besides Image Studio and Auto Edit, Motio2edit exposes tools such as Circle 2edit, Filters, Frames, CropMix, and Remove Background. Specialized entries (for example age or multi-image on eligible plans) appear in Studio or Image Tools when enabled.",
      },
      {
        q: "How does watermarking apply to these tools?",
        a: "Eligible Free visual outputs show the Motio2edit watermark. Paid users can choose keep or remove where the feature supports it.",
      },
    ],
  },
  {
    title: "Watermarks",
    items: [
      {
        q: "Do Free users get a watermark?",
        a: "Yes. Eligible visual generated and edited results for Free users display the Motio2edit watermark. The watermark remains visible in the result preview and History presentation, and Free users cannot remove it.",
      },
      {
        q: "Can paid users remove the watermark?",
        a: "Yes. Paid users can choose whether to keep or remove the watermark where the feature is supported.",
      },
      {
        q: "Does the watermark permanently change my original generated image?",
        a: "No. The clean source media remains the underlying result. The watermark is applied for the displayed or downloaded version according to your plan and watermark choice.",
      },
      {
        q: "Can I change the watermark choice later?",
        a: "For paid users, History watermark controls allow switching between keeping and removing the watermark where supported.",
      },
      {
        q: "Does the History card show the watermark?",
        a: "Free: the watermark is visible on History thumbnails and full-screen History preview. Paid: the watermark is not forced when you have chosen to remove it. Paid users get a keep/remove control where supported.",
      },
      {
        q: "What happens if I long-press, save, or download a Free image?",
        a: "The downloaded or saved result follows the Free watermark rule. Free users cannot bypass the watermark through the browser image URL or long-press save.",
      },
      {
        q: "Does Music Studio use the same watermark?",
        a: "No. Music is audio and does not use the visual Motio2edit watermark applied to images and videos.",
      },
      {
        q: "Does Auto Edit use the same watermark?",
        a: "Auto Edit visual results follow the same Free vs paid visual watermark rules as other image tools.",
      },
    ],
  },
  {
    title: "History",
    items: [
      {
        q: "What is History?",
        a: "History is where your eligible past generations and edits are listed so you can preview, download, delete, or edit again — subject to your plan.",
      },
      {
        q: "What appears in History?",
        a: "Successful eligible image, video, music, Auto Edit, Circle 2edit, and other tool results can appear, organized by category tabs where available.",
      },
      {
        q: "Does every successful generation save to History?",
        a: "Eligible successful results are retained according to your History preference and plan rules. If History is turned off in settings, new items may not be retained.",
      },
      {
        q: "What happens for Free users?",
        a: "Free users have limited History access. Results may be available temporarily after generation, but full History browsing and open/download from History requires a paid plan.",
      },
      {
        q: "Can Free users open History items?",
        a: "Free accounts see History in a locked state for opening full items. Upgrade to unlock full History access.",
      },
      {
        q: "Why might a Free user’s result be visible elsewhere but locked in History?",
        a: "You may still see a temporary result in the tool’s result view after generation, while History remains locked on Free so long-term library access is a paid benefit.",
      },
      {
        q: "How long is a Free generation available?",
        a: "Free results are available for a limited time (up to about 6 hours per Free plan guidance). After that window, temporary availability ends.",
      },
      {
        q: "What happens if a Free user upgrades during the available window?",
        a: "Upgrading unlocks paid History and watermark controls for eligible items according to your new plan, including items still within retention.",
      },
      {
        q: "What happens to paid-user History?",
        a: "Paid users can open, download, delete, and edit again from History. Watermark keep/remove is available where supported.",
      },
      {
        q: "What happens after prolonged account inactivity?",
        a: "Long-term storage and retention follow Motio2edit’s product rules for inactive accounts. Keep an active paid plan and download important work if you need a permanent local copy.",
      },
      {
        q: "Can I delete a History item?",
        a: "Yes, when History is unlocked for your plan. Deleting removes the item from your History list.",
      },
      {
        q: "Can I download from History?",
        a: "Yes on plans that unlock History. Downloads respect your plan’s watermark rules.",
      },
      {
        q: "Can I edit again from History?",
        a: "Yes on unlocked History. Many items offer Edit again to reopen the media in the appropriate studio or editor.",
      },
      {
        q: "Can I view generation details?",
        a: "Opening a History item shows the media and available actions. Prompt or metadata details appear when stored with that generation.",
      },
      {
        q: "Does History store my media permanently on Motio2edit?",
        a: "History retention depends on plan and product rules. Free is short-lived; paid History is for ongoing access while your account and plan remain active. Download anything you need to keep offline.",
      },
    ],
  },
  {
    title: "Credits",
    items: [
      {
        q: "What are credits?",
        a: "Credits are the balance used to run generations and AI tools on Motio2edit. Different tools and quality settings use different amounts.",
      },
      {
        q: "How are credits calculated?",
        a: "Each tool shows an estimate based on mode, quality, duration, references, and similar settings before you confirm.",
      },
      {
        q: "Why can different settings cost different amounts?",
        a: "Higher quality, longer video or music, more references, and Premium tiers generally cost more because they use more advanced processing.",
      },
      {
        q: "Does the displayed quote match the actual charge?",
        a: "Yes. The quote shown before Generate is what is charged when the job succeeds.",
      },
      {
        q: "When are credits charged?",
        a: "Credits are charged for successful generations. Failed jobs are not charged.",
      },
      {
        q: "Are failed generations charged?",
        a: "No. Failed generations do not charge credits.",
      },
      {
        q: "Where can I see my balance?",
        a: "Your credit balance appears in the header and in your account or dashboard areas after you sign in.",
      },
      {
        q: "What happens if I don’t have enough credits?",
        a: "Generation is blocked until you have enough credits. You can wait for plan refresh on a subscription, purchase a top-up if offered, or upgrade your plan.",
      },
    ],
  },
  {
    title: "Plans & Features",
    items: [
      {
        q: "What plans are available?",
        a: "Motio2edit offers Free, Lite, Plus, Pro, Studio, and Master Studio. Each plan increases credits and unlocks more studio features.",
      },
      {
        q: "What does Free include?",
        a: "Starter credits, AI image generation and editing, Circle 2edit, single-image edits, watermarked visual outputs, limited Music (song/instrumental), and limited History access. Video requires upgrade.",
      },
      {
        q: "What do paid plans unlock?",
        a: "More monthly credits, multi-reference images, Video Studio, fuller Music Studio modes and durations, watermark-free downloads, and full History access. Higher plans add Premium/Ultra image experiences and longer or higher-quality media.",
      },
      {
        q: "Where can I compare plans?",
        a: "Open the Pricing page in the app for the current plan comparison and checkout options.",
      },
      {
        q: "Do I need a paid plan for Video Studio?",
        a: "Yes. Video Studio is locked on Free and available on Lite and higher.",
      },
      {
        q: "Do I need a paid plan for Music Studio?",
        a: "Music Studio is available to signed-in Free users with limits. Paid plans unlock more modes, longer tracks, Premium quality, and image/video inputs.",
      },
    ],
  },
  {
    title: "Download & Share",
    items: [
      {
        q: "How do I download a result?",
        a: "Use the download button on the result view or from History when History is unlocked for your plan.",
      },
      {
        q: "How does watermarking affect downloads?",
        a: "Free visual downloads include the Motio2edit watermark. Paid users can download without the watermark when they choose remove where supported.",
      },
      {
        q: "Can I share my result?",
        a: "Yes. Use the share controls on the result when available on your device and browser.",
      },
      {
        q: "Can I download from History?",
        a: "Yes on plans that unlock History. Free History remains locked for full open/download.",
      },
      {
        q: "What happens if a media link has expired?",
        a: "You may need to regenerate or, on paid plans, rely on History while the item is still retained. Expired temporary links cannot be recovered after the availability window.",
      },
      {
        q: "Can I download a Free result after its temporary availability expires?",
        a: "No. After the Free temporary window ends, that result is no longer available to download. Upgrade and use History for longer retention of new work.",
      },
    ],
  },
  {
    title: "Account & Privacy",
    items: [
      {
        q: "How do I sign in?",
        a: "Use Sign in with email and password or Google. After sign-in you return to the app with your credits and plan.",
      },
      {
        q: "How do I change settings?",
        a: "Open Settings from your account area to manage preferences available for your account.",
      },
      {
        q: "How do I control History?",
        a: "If History preference controls are available in Settings, you can turn History retention on or off. When off, new items may not be saved to History.",
      },
      {
        q: "What happens to expired generations?",
        a: "Expired Free or temporary results are no longer available in the product. Download anything important before the window ends.",
      },
      {
        q: "How are private or temporary results handled?",
        a: "Results are tied to your account. Temporary Free results are only available for a limited time. Paid History keeps eligible items available while your plan and retention rules allow.",
      },
    ],
  },
];

function FAQ() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const visibleCats = CATEGORIES.filter((cat) => cat.visible !== false);
    const q = query.trim().toLowerCase();
    if (!q) return visibleCats;
    return visibleCats
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-muted-foreground">
          Everything you need to know about Motio2edit.
        </p>
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="pl-9"
          />
        </div>
        <div className="mt-10 space-y-10">
          {filtered.map((cat) => (
            <section key={cat.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {cat.title}
              </h2>
              <div className="mt-3 space-y-4">
                {cat.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-border bg-card px-4 py-3 open:shadow-sm"
                  >
                    <summary className="cursor-pointer list-none font-medium marker:content-none">
                      {item.q}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No matches. Try a different search.
            </p>
          )}
        </div>
      </main>
      <FooterAd />
      <Footer />
    </div>
  );
}
