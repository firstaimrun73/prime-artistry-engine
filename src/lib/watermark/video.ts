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
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => { code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-800)}`)); });
  });
}

export async function renderVideoWatermark(input: Buffer, mode: WatermarkMode): Promise<Buffer> {
  if (mode === "none") return input;
  const dir = await mkdtemp(join(tmpdir(), "motio-wm-"));
  const inPath = join(dir, "in.mp4"), outPath = join(dir, "out.mp4");
  try {
    await writeFile(inPath, input);
    const primary = `drawtext=text='${WATERMARK_BRAND_TEXT}':fontsize=h*0.035:fontcolor=white:borderw=2:bordercolor=black@0.6:x=w-tw-24:y=h-th-24:alpha=0.92`;
    const secondary = mode === "primary+secondary"
      ? `,drawtext=text='M2':fontsize=h*0.04:fontcolor=${WATERMARK_BRAND_ORANGE.replace("#","0x")}:borderw=1:bordercolor=black@0.5:x=20:y=20:alpha=0.85`
      : "";
    await runFfmpeg(["-y","-i",inPath,"-vf",primary+secondary,"-c:v","libx264","-preset","fast","-crf","18","-c:a","copy","-movflags","+faststart",outPath]);
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
