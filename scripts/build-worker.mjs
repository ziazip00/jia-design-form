import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import path from "node:path";
const root = path.resolve("out");
// Static assets stay outside the Worker bundle, including OCR models and WASM.
cpSync(root, path.resolve("dist/client"), { recursive: true });
mkdirSync("dist/server", { recursive: true });
const api = readFileSync("server/images.mjs", "utf8").replaceAll("export ", "");
writeFileSync(
  "dist/server/index.js",
  api +
    `\nexport default {async fetch(request,env){
 const url=new URL(request.url);if(url.pathname==='/api/images')return images(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(env.ASSETS)return env.ASSETS.fetch(request);
 return new Response('Not found',{status:404});
}};\n`,
);
console.log("Worker artifact prepared: dist/server/index.js");
