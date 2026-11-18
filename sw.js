// 离线收藏 PWA Service Worker
// 策略：同源 GET 请求缓存优先（首次在线访问时缓存全部资源），之后完全离线可用。
const CACHE = "ov91-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === "basic") {
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        // SPA 导航兜底：返回缓存的首页
        const shell =
          (await cache.match("/")) ||
          (await cache.match("/index.html")) ||
          new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        return shell;
      }
    })()
  );
});
