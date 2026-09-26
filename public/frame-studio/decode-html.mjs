import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const parts = [0, 1, 2].map((i) =>
  fs.readFileSync(path.join(dir, `frame-studio-v5.html.b64.part${i}`), "utf8"),
);
const b64 = parts.join("");
fs.writeFileSync(path.join(dir, "frame-studio-v5.html"), Buffer.from(b64, "base64"));
console.log("decoded frame-studio-v5.html", Buffer.from(b64, "base64").length, "bytes");
