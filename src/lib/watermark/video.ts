import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WatermarkMode } from "./types";
import { WATERMARK_BRAND_TEXT, WATERMARK_BRAND_ORANGE } from "@/lib/watermark-config";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-800)}`));
    });
  });
}

/**
 * Burn Motio2edit mark onto the finished video (non-generative overlay).
 * Bottom-right: brand label + accent 2. Optional secondary top-left.
 */
export async function renderVideoWatermark(input: Buffer, mode: WatermarkMode): Promise<Buffer> {
  if (mode === "none") return input;
  const dir = await mkdtemp(join(tmpdir(), "motio-wm-"));
  const inPath = join(dir, "in.mp4");
  const outPath = join(dir, "out.mp4");
  try {
    await writeFile(inPath, input);
    const primary =
      `drawtext=text='${WATERMARK_BRAND_TEXT}':fontsize=h*0.032:fontcolor=white@0.92:` +
      `borderw=2:bordercolor=black@0.55:x=w-tw-28:y=h-th-28`;
    const accent =
      `drawtext=text='2':fontsize=h*0.028:fontcolor=${WATERMARK_BRAND_ORANGE.replace("#", "0x")}@0.9:` +
      `borderw=1:bordercolor=black@0.45:x=w-tw-28:y=h-th-28-h*0.038`;
    const secondary =
      mode === "primary+secondary"
        ? `,drawtext=text='M2':fontsize=h*0.036:fontcolor=${WATERMARK_BRAND_ORANGE.replace("#", "0x")}:` +
          `borderw=1:bordercolor=black@0.5:x=20:y=20:alpha=0.85`
        : "";
    const vf = `${primary},${accent}${secondary}`;
    await runFfmpeg([
      "-y",
      "-i",
      inPath,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
