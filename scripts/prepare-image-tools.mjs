import {
  mkdir,
  copyFile,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const root = process.cwd();
const out = join(root, "public", "image-tools");
await mkdir(out, { recursive: true });
const tess = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(
  createRequire(join(tess, "package.json")).resolve(
    "tesseract.js-core/package.json",
  ),
);
const ort = dirname(dirname(require.resolve("onnxruntime-web")));
for (const dir of ["ocr", "ort", "models", "languages", "licenses"])
  await mkdir(join(out, dir), { recursive: true });
await copyFile(
  join(tess, "dist/worker.min.js"),
  join(out, "ocr/worker.min.js"),
);
for (const file of await readdir(core))
  if (/^tesseract-core.*\.wasm(\.js)?$/.test(file))
    await copyFile(join(core, file), join(out, "ocr", file));
for (const file of [
  "ort.wasm.min.mjs",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
])
  await copyFile(join(ort, "dist", file), join(out, "ort", file));
await copyFile(join(tess, "LICENSE.md"), join(out, "licenses/tesseract.txt"));
async function download(url, target, md5) {
  try {
    const data = await readFile(target);
    if (!md5 || createHash("md5").update(data).digest("hex") === md5) return;
  } catch {}
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok)
    throw new Error(`Download failed: ${response.status} ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (md5 && createHash("md5").update(data).digest("hex") !== md5)
    throw new Error("Model checksum mismatch");
  await writeFile(target, data);
}
await download(
  "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx",
  join(out, "models/u2netp.onnx"),
  "8e83ca70e441ab06c318d82300c84806",
);
for (const lang of ["eng", "kor"])
  await download(
    `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata`,
    join(out, `languages/${lang}.traineddata`),
  );
await download(
  "https://raw.githubusercontent.com/xuebinqin/U-2-Net/master/LICENSE",
  join(out, "licenses/u2net.txt"),
);
await download(
  "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/LICENSE",
  join(out, "licenses/tessdata.txt"),
);
await download(
  "https://raw.githubusercontent.com/microsoft/onnxruntime/main/LICENSE",
  join(out, "licenses/onnxruntime.txt"),
);
console.log("Local OCR and segmentation assets prepared.");
