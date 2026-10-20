import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
test("failed shell update never caches errors; successful update retains IndexedDB", async ({
  page,
}) => {
  let version = 1,
    fail = false;
  const root = resolve("dist");
  const server = createServer((req, res) => {
    let path = new URL(req.url, "http://localhost").pathname;
    if (path === "/sw.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(
        readFileSync(root + "/sw.js", "utf8").replace(
          /sobri-shell-[a-f0-9]+/,
          `sobri-shell-test${version}`,
        ),
      );
      return;
    }
    if (fail && path === "/favicon.svg") {
      res.writeHead(503);
      res.end("Temporary error");
      return;
    }
    if (path === "/") path = "/index.html";
    const file = resolve(root, "." + path);
    if (!file.startsWith(root + "/") || !existsSync(file)) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webmanifest": "application/manifest+json",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(4180, "127.0.0.1", r));
  try {
    await page.goto("http://127.0.0.1:4180");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.evaluate(async () => {
      const db = await new Promise((r) => {
        const req = indexedDB.open("sobri-study", 1);
        req.onsuccess = () => r(req.result);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction("notes", "readwrite");
        tx.objectStore("notes").put({
          id: "preserved",
          title: "Keep me",
          body: "Local data",
          category: "BTKV",
          revisions: [],
        });
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    });
    version = 2;
    fail = true;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      const worker = reg.installing;
      if (worker)
        await new Promise((resolve) => {
          worker.addEventListener("statechange", () => {
            if (worker.state === "redundant") resolve();
          });
        });
    });
    const cachedErrors = await page.evaluate(async () => {
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const req of await cache.keys()) {
          const response = await cache.match(req);
          if (!response.ok) return true;
        }
      }
      return false;
    });
    expect(cachedErrors).toBe(false);
    expect(
      await page.evaluate(() => fetch("/missing.js").then((r) => r.status)),
    ).toBe(404);
    expect(
      await page.evaluate(() => caches.match("/missing.js").then(Boolean)),
    ).toBe(false);
    version = 3;
    fail = false;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      const worker = reg.installing;
      if (worker)
        await new Promise((resolve) =>
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") resolve();
          }),
        );
      const ready = reg.waiting;
      if (ready) {
        const changed = new Promise((resolve) =>
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            resolve,
            { once: true },
          ),
        );
        ready.postMessage("SKIP_WAITING");
        await changed;
      }
    });
    await page.reload();
    expect(
      await page.evaluate(async () => {
        const db = await new Promise((r) => {
          const req = indexedDB.open("sobri-study", 1);
          req.onsuccess = () => r(req.result);
        });
        return new Promise((resolve) => {
          const req = db
            .transaction("notes")
            .objectStore("notes")
            .get("preserved");
          req.onsuccess = () => resolve(req.result.title);
        });
      }),
    ).toBe("Keep me");
    await expect
      .poll(() => page.evaluate(() => caches.keys()))
      .toEqual(["sobri-shell-test3"]);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
