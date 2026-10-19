// Offline cache. Our own files: always revalidated with the server (no stale 10-minute HTTP cache),
// cached copy used only when offline. Supabase API calls are never cached.
const VERSION = "keepo-v34";
const SHELL = ["./", "index.html", "app.js", "config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || /supabase\.co$/.test(url.hostname) || /\.mp4$/.test(url.pathname)) return; // video: let the browser stream it
  const own = url.origin === self.location.origin;
  e.respondWith(
    fetch(own ? new Request(req, { cache: "no-cache" }) : req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
