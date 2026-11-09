const cacheName = "gymlogg-static-v1";
const assets = ["./", "./index.html", "./style.css", "./seed.js", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("gymlogg-static-") && key !== cacheName).map((key) => caches.delete(key))
  )));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html")));
    return;
  }
  if (!assets.some((asset) => new URL(asset, self.registration.scope).href === url.href)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
