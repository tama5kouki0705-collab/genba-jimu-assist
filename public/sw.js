self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open("genba-jimu-v2").then((cache) => cache.addAll(["/manifest.json", "/icon.svg"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== "genba-jimu-v2").map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" || event.request.url.includes("/_next/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open("genba-jimu-v2").then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
