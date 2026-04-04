const CACHE_NAME = "sales-app-v3"; // ← 変えた！

const urlsToCache = [
  "./",
  "./manifest.json"
];

// インストール
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// アクティベート
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // ← 古いやつだけ消す！
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// フェッチ（ここが超重要）
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") {
    // HTMLは常にネット優先
    event.respondWith(fetch(event.request));
  } else {
    // それ以外はキャッシュ優先
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
