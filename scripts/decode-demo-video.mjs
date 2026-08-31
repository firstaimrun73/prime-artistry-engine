import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public/demo/video");
const outPath = path.join(dir, "motio2edit-demo.mp4");

// Prefer assembled base64 parts (git-friendly text), else single b64, else existing mp4
const parts = fs
  .readdirSync(dir)
  .filter((n) => n.startsWith("motio2edit-demo.mp4.b64.part"))
  .sort();
let b64 = "";
if (parts.length) {
  b64 = parts.map((n) => fs.readFileSync(path.join(dir, n), "utf8")).join("");
} else {
  const single = path.join(dir, "motio2edit-demo.mp4.b64");
  if (fs.existsSync(single)) b64 = fs.readFileSync(single, "utf8");
}
if (!b64) {
  if (fs.existsSync(outPath)) {
    console.log("[decode-demo-video] mp4 already present", fs.statSync(outPath).size);
    process.exit(0);
  }
  console.warn("[decode-demo-video] no b64 source found");
  process.exit(0);
}
b64 = b64.replace(/\s+/g, "");
fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
console.log("[decode-demo-video] wrote", outPath, fs.statSync(outPath).size, "bytes");
