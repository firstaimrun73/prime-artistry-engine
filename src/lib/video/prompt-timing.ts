/**
 * Prompt timing tags for Video Studio.
 *
 * Supported tokens (case-insensitive):
 *   #1sec  #1s     → timestamp at 1.0s
 *   #01:03        → interval 1s–3s (mm:ss not required; simple a:b seconds)
 *   #1-3sec       → interval 1s–3s
 *
 * Parser is UI + validation only. Provider routing does not yet consume cues.
 */

export type TimingCue = {
  kind: "timestamp" | "interval";
  startSec: number;
  endSec: number;
  raw: string;
};

export type ParsePromptTimingResult = {
  cues: TimingCue[];
  cleanPrompt: string;
  errors: string[];
};

const TOKEN_RE =
  /#(?:(\d+(?:\.\d+)?)sec|(\d+(?:\.\d+)?)s|(\d{1,3}):(\d{1,3})|(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)sec)/gi;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function parsePromptTiming(prompt: string): ParsePromptTimingResult {
  const cues: TimingCue[] = [];
  const errors: string[] = [];
  if (!prompt || typeof prompt !== "string") {
    return { cues, cleanPrompt: "", errors };
  }

  let clean = prompt;
  const matches = [...prompt.matchAll(TOKEN_RE)];
  // Process from end so indices stay valid when slicing
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const raw = m[0];
    const idx = m.index ?? 0;

    let cue: TimingCue | null = null;

    if (m[1] != null || m[2] != null) {
      // #1sec / #1s
      const sec = parseFloat(m[1] ?? m[2]);
      if (Number.isFinite(sec) && sec >= 0) {
        const s = round3(sec);
        cue = { kind: "timestamp", startSec: s, endSec: s, raw };
      }
    } else if (m[3] != null && m[4] != null) {
      // #01:03
      const a = parseInt(m[3], 10);
      const b = parseInt(m[4], 10);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const start = round3(a);
        const end = round3(b);
        if (end <= start) {
          errors.push(`Invalid interval ${raw}: end must be after start.`);
        } else {
          cue = { kind: "interval", startSec: start, endSec: end, raw };
        }
      }
    } else if (m[5] != null && m[6] != null) {
      // #1-3sec
      const start = round3(parseFloat(m[5]));
      const end = round3(parseFloat(m[6]));
      if (Number.isFinite(start) && Number.isFinite(end)) {
        if (end <= start) {
          errors.push(`Invalid interval ${raw}: end must be after start.`);
        } else {
          cue = { kind: "interval", startSec: start, endSec: end, raw };
        }
      }
    }

    if (cue) {
      cues.unshift(cue);
      clean = clean.slice(0, idx) + clean.slice(idx + raw.length);
    }
  }

  clean = clean.replace(/\s{2,}/g, " ").trim();
  return { cues, cleanPrompt: clean, errors };
}

export function validateTimingAgainstDuration(
  cues: TimingCue[],
  durationSec: number,
): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(durationSec) || durationSec <= 0) return errors;
  for (const c of cues) {
    if (c.startSec > durationSec) {
      errors.push(`Timing ${c.raw} starts after video duration (${durationSec}s).`);
    }
    if (c.endSec > durationSec) {
      errors.push(`Timing ${c.raw} ends after video duration (${durationSec}s).`);
    }
  }
  return errors;
}

export function timingChipLabel(cue: TimingCue): string {
  if (cue.kind === "timestamp") {
    return `${cue.startSec}s`;
  }
  return `${cue.startSec}–${cue.endSec}s`;
}
