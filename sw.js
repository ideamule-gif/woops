const CACHE_NAME = 'woops-v1';
const ASSETS = [
  'index.html',
  'manifest.json'
];

// Установка воркера и кэширование базовых файлов
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Активация и очистка старого кэша
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

// Стратегия: сначала сеть, если сети нет — берем из кэша
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});