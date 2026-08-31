/** Client-side mask statistics from working mask canvas (natural resolution). */
import type { WorkingMask } from "./maskCanvas";
import type { MaskStatsPayload } from "@/lib/circle-edit/mask-stats";

const ON_THRESHOLD = 24;

export function computeMaskStats(mask: WorkingMask): MaskStatsPayload | null {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = mask;
  const data = ctx.getImageData(0, 0, width, height).data;
  let painted = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a >= ON_THRESHOLD) {
        painted++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        sumX += x;
        sumY += y;
      }
    }
  }

  const total = width * height;
  if (painted === 0 || total === 0) return null;

  // Map working coords → natural
  const sx = mask.natural.width / width;
  const sy = mask.natural.height / height;
  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);

  return {
    width: mask.natural.width,
    height: mask.natural.height,
    coveragePercent: Math.round((painted / total) * 10000) / 100,
    paintedPixels: Math.round(painted * sx * sy),
    totalPixels: mask.natural.width * mask.natural.height,
    boundingBox: {
      x: Math.round(minX * sx),
      y: Math.round(minY * sy),
      width: Math.round(bw * sx),
      height: Math.round(bh * sy),
    },
    centerX: sumX / painted / width,
    centerY: sumY / painted / height,
  };
}
