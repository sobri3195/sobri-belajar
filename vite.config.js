import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export default defineConfig({
  plugins: [
    {
      name: "offline-shell",
      generateBundle(_, bundle) {
        const files = [
          "/",
          "/index.html",
          "/manifest.webmanifest",
          "/favicon.svg",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          ...Object.keys(bundle)
            .filter((x) => /\.(js|css)$/.test(x))
            .map((x) => "/" + x),
        ];
        const version = createHash("sha256")
          .update(JSON.stringify(files))
          .update(
            files
              .filter(
                (p) =>
                  !p.startsWith("/assets/") &&
                  !["/", "/index.html"].includes(p),
              )
              .map((p) => readFileSync("public" + p).toString("base64"))
              .join(""),
          )
          .digest("hex")
          .slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `const CACHE='sobri-shell-${version}';const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const path of FILES){const response=await fetch(new Request(path,{cache:'reload'}));if(!response.ok)throw Error('Asset unavailable: '+path);await cache.put(path,response);}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('sobri-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok)return response;return await caches.match('/index.html')||response;}catch{return await caches.match('/index.html')||new Response('Aplikasi belum tersimpan. Buka sekali saat online.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());return;}if(FILES.includes(url.pathname))event.respondWith((async()=>{const cached=await caches.match(url.pathname);if(cached)return cached;const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;})());});`,
        });
      },
    },
  ],
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
});
