/** Expand rough user marks into a solid B/W mask region for AI erase/inpaint. */
export function expandMarkToSolidMask(
  src: ImageData,
  width: number,
  height: number,
): ImageData {
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  let painted = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (src.data[i + 3] >= 24) {
        painted++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const out = new ImageData(width, height);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 0;
    out.data[i + 1] = 0;
    out.data[i + 2] = 0;
    out.data[i + 3] = 255;
  }
  if (painted === 0) return out;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max(4, (maxX - minX) / 2 + 2);
  const ry = Math.max(4, (maxY - minY) / 2 + 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) {
        const i = (y * width + x) * 4;
        out.data[i] = 255;
        out.data[i + 1] = 255;
        out.data[i + 2] = 255;
      }
    }
  }
  return out;
}
