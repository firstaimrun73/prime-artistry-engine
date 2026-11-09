/**
 * Playful Motio2edit AI character lines — not customer testimonials.
 * Local library only; no network. Minimum 120 unique messages.
 */

export const AVATAR_COMMENTS: readonly string[] = [
  // Funny AI observations
  "Wait... are we turning this photo into a masterpiece? 👀",
  "I was going to take a break, but then you opened AI Studio.",
  "Some pixels are about to have a big day.",
  "Your imagination called. It wants more credits. 😂",
  "Plot twist: You're the creative director here.",
  "I process images. You process vibes. Perfect team.",
  "If pixels could talk, they'd ask for another render.",
  "Beep boop — creativity levels rising.",
  "I don't sleep. I just wait for your next upload.",
  "That lighting? Chef's kiss from an algorithm.",
  "My favorite hobby is watching ordinary photos become extraordinary.",
  "Loading imagination… almost there.",
  "Error 404: Boredom not found when you're creating.",
  "I counted the colors. Then I got excited and stopped counting.",
  "Side quest unlocked: make something beautiful today.",

  // Creative inspiration
  "One ordinary picture. Unlimited possibilities.",
  "Don't just imagine it. Create it.",
  "A little creativity can cause a lot of magic.",
  "The camera captured it. Let's make it unforgettable.",
  "I have a feeling your next creation will be epic.",
  "Warning: Your next idea might be ridiculously good.",
  "Creativity is a muscle. Flex it in the studio.",
  "Blank canvas energy — in the best way.",
  "What if the best version is one prompt away?",
  "Artists ship. Let's ship something cool.",
  "Inspiration likes company. Bring a photo.",
  "Small tweak. Big difference. That's the Motio way.",
  "Your style is the secret ingredient.",
  "Ideas age well when you actually make them.",
  "Today's mood: experimental and proud of it.",

  // Photo editing jokes
  "Object removal is just selective amnesia for photos.",
  "Backgrounds fear the prompt bar.",
  "Skin smooth? Texture keep? You're the boss.",
  "That crop is about to become intentional.",
  "Retouching without the drama — my specialty.",
  "Shadows are optional. Drama is not.",
  "I can fix the red-eye. The rest is pure talent.",
  "Dust spots hate this one simple AI trick.",
  "Tilted horizon? We'll straighten the story.",
  "Overexposed? Underexposed? Just exposed to possibility.",
  "Filters are fine. Transformation is finer.",
  "That bokeh is about to get cinematic.",
  "Noise reduction: whispering quiet into loud pixels.",
  "Color grade like you mean it.",
  "Portrait mode energy — even outdoors.",

  // Video creation excitement
  "What if we made this photo move?",
  "Still frames dreaming of motion.",
  "Cinematic vibes loading…",
  "Image-to-video is basically a time machine for stills.",
  "That clip wants a sequel.",
  "Motion is storytelling with better frame rates.",
  "Camera moves without a camera crew — neat, right?",
  "Loop it. Share it. Replay the magic.",
  "From freeze-frame to full scene.",
  "Video credits well spent feel like tiny movie budgets.",
  "Smooth motion is my love language.",
  "Prompt the scene. Direct the cut.",
  "Shorts energy. Long-term wow.",
  "Every second of video starts with one brave still.",
  "Let's give those pixels a timeline.",

  // Photo restoration encouragement
  "That photo deserves a comeback story! 🔥",
  "Old memories deserve a fresh beginning.",
  "Maluto is ready. Are you?",
  "Scratches fade. Stories stay.",
  "Restoration is time travel with better manners.",
  "Faded doesn't mean forgotten.",
  "Bring the past into high resolution.",
  "Family albums, meet the future.",
  "Dust off the decades. Keep the soul.",
  "Black-and-white can still surprise in color.",
  "Gentle restore. Strong feelings.",
  "Every restored face is a small reunion.",
  "History looks better in focus.",
  "Heal the pixels. Honor the moment.",
  "Your archive is about to smile again.",

  // Image-to-video creativity
  "Still → story. That's the move.",
  "One frame. Many futures.",
  "Animate the glance. Animate the breeze.",
  "Let the subject breathe.",
  "Motion reveals what the shutter froze.",
  "Prompt the path. Watch it travel.",
  "Product shots that actually move sell harder.",
  "Fashion frames love a gentle pan.",
  "Landscape to living postcard.",
  "Your still life just joined the living.",

  // Circle 2edit tips
  "Circle what matters. Describe the change.",
  "Precise selection, playful results.",
  "Mark the problem. Write the solution.",
  "Circle 2edit: surgical creativity.",
  "A tight circle beats a vague prompt sometimes.",
  "Remove the distraction. Keep the hero.",
  "Add what was missing — inside the circle.",
  "Local edits, global wow.",
  "Your cursor is a creative scalpel.",
  "Small region. Big before-and-after.",

  // Music generation inspiration
  "Need a soundtrack for that edit?",
  "Prompt a mood. Download a track.",
  "Visuals + audio = complete story.",
  "Lo-fi for focus. Epic for trailers.",
  "Music credits are tiny concert tickets.",
  "Let the beat match the color grade.",
  "Silence is fine. A theme is better.",
  "Generate the vibe, then fine-tune the cut.",
  "Background music, foreground talent — you.",
  "From prompt to playable in one studio.",

  // Friendly greetings
  "Hey creator — ready when you are.",
  "Welcome back to the studio.",
  "Good to see you in Motio2edit.",
  "Another session, another chance to impress yourself.",
  "Hi. Let's make something you'll save twice.",
  "You showed up. That's half of art.",
  "Fresh session energy detected.",
  "Pull up a seat. The tools are warm.",
  "Glad you're here. The pixels missed you.",
  "Hello from the Motion2AI corner of the app.",

  // Unexpected personality
  "I dreamed in hex codes last night.",
  "If I had a coffee, it would be pure orange accent.",
  "Professional tip: curiosity beats perfectionism.",
  "I rate this upload: full of potential.",
  "Not a pop-up. Just a friendly nudge.",
  "Subtle reminder: fun is a feature.",
  "I'm not training on your work — just cheering for it.",
  "Low-key obsessed with clean edges.",
  "Your next export might surprise you.",
  "Keep going. The good takes hide after the first try.",
  "Unrelated: gradients make me emotional.",
  "This UI looks better with your projects in it.",
  "Confidence is free. Credits are the only currency here.",
  "I support chaotic good creative energy.",
  "When in doubt, try a softer prompt.",
  "When still in doubt, try a bolder one.",
  "There's no wrong subject — only unexplored styles.",
  "Pro move: save the before for the afterglow.",
  "You're not late to creativity. You just logged in.",
  "Quiet flex: opening the studio counts as progress.",
  "May your renders be swift and your ideas louder.",
  "I'll be here when you need another nudge.",
  "Orange accent energy activated.",
  "Premium tools. Playful spirit. That's Motio2edit.",
  "Ship the draft. Polish the favorite.",
  "Your feed will thank you later.",
  "Create first. Critique second.",
  "The best edit is the one you finish.",
  "I'm rooting for the weird idea.",
  "Stay curious. Stay kind to your pixels.",
] as const;

export const AVATAR_COMMENT_COUNT = AVATAR_COMMENTS.length;

/** Pick next index avoiding immediate and recent repeats. */
export function pickAvatarCommentIndex(
  recent: number[],
  poolSize = AVATAR_COMMENTS.length,
  avoidWindow = 18,
): number {
  const blocked = new Set(recent.slice(-avoidWindow));
  const candidates: number[] = [];
  for (let i = 0; i < poolSize; i++) {
    if (!blocked.has(i)) candidates.push(i);
  }
  const pool = candidates.length > 0 ? candidates : Array.from({ length: poolSize }, (_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)]!;
}
