// Offline copy for the self-hosted Footdex. The page is refreshed from the network when
// possible; data, photos and videos are kept once seen, so the album opens without internet.
const CACHE = "footdex-__VERSION__"; // written by tools/build-app.mjs at each build
const SHELL = ["./", "index.html", "data/core.json", "data/album-faces.json", "img/une.webp", "img/une-800.webp", "manifest.webmanifest", "favicon.svg"];

self.addEventListener("install", (event) => {
  // No skipWaiting here: the new version waits until the child says « Mettre à jour ».
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  // The album data changes every Monday: fetched first, the saved copy only when offline.
  const isAlbum = sameOrigin && url.pathname.endsWith("/data/core.json");
  if (isAlbum) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("data/core.json", copy));
          }
          return res;
        })
        .catch(() => caches.match("data/core.json")),
    );
    return;
  }
  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("index.html", copy));
          return res;
        })
        .catch(() => caches.match("index.html")),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && !url.pathname.endsWith(".mp4")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// « Mettre à jour » in the app: the waiting version takes over (the page then reloads once).
self.addEventListener("message", (event) => {
  if (event.data === "mettre-a-jour") self.skipWaiting();
});
