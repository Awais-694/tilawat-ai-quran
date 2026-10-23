// Tilawat PWA service worker — offline caching and stale-while-revalidate.
const CACHE = "tilawat-v14";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/", "/surahs", "/manifest.json"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Sirf GET requests aur same origin handle karo
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Development / Webpack HMR endpoints ko intercept na karo
  if (
    url.pathname.includes("_next/webpack-hmr") ||
    url.pathname.includes("__nextjs") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  // PDFs: try network first, but if offline serve from cache if available
  if (url.pathname.endsWith(".pdf") || url.pathname.includes(".pdf")) {
    e.respondWith(
      (async () => {
        try {
          return await fetch(e.request);
        } catch {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          return new Response("PDF Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);

      try {
        const response = await fetch(e.request);
        // Agar response valid hai toh cache update karo
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return response;
      } catch (err) {
        // Network fail hone par cache se return karo agar mojood hai
        if (cached) {
          return cached;
        }

        // Agar user page navigate kar raha hai aur offline hai
        if (e.request.mode === "navigate") {
          const offlineFallback = await caches.match("/");
          if (offlineFallback) return offlineFallback;
        }

        // Hamesha valid Response object return karo taake TypeError na aaye
        return new Response("Offline - Content not available", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
        });
      }
    })()
  );
});
