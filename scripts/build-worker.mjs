import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
const root = path.resolve("out");
const assets = {};
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else {
      const route = "/" + path.relative(root, file).replaceAll("\\", "/");
      assets[route] = readFileSync(file).toString("base64");
    }
  }
}
scan(root);
mkdirSync("dist/server", { recursive: true });
const api = readFileSync("server/generate.mjs", "utf8").replaceAll(
  "export ",
  "",
);
writeFileSync(
  "dist/server/index.js",
  api +
    `\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env){
 const url=new URL(request.url);if(url.pathname==='/api/generate')return generate(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const route=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
 const data=assets[route];if(!data)return new Response('Not found',{status:404});
 const extension=route.split('.').pop();const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',txt:'text/plain; charset=utf-8',json:'application/json',svg:'image/svg+xml',png:'image/png',woff2:'font/woff2'};
 return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(data),c=>c.charCodeAt(0)),{headers:{'Content-Type':mime[extension]||'application/octet-stream','Cache-Control':route.startsWith('/_next/static/')?'public,max-age=31536000,immutable':'no-cache'}});
}};\n`,
);
console.log("Worker artifact prepared: dist/server/index.js");
