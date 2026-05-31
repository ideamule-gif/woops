// ==========================================================================
// 🚀 SERVICE WORKER: УПРАВЛЕНИЕ КЭШОМ И ОФЛАЙН-РЕЖИМОМ (ВЕРСИЯ 4)
// ==========================================================================
const CACHE_NAME = 'woops-v4'; // Инкремент версии сбрасывает память браузера под чистый минимализм

const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// ==================== ИНСТАЛЛЯЦИЯ (INSTALL) ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Woops SW: Кэширование монохромной двухколоночной сборки');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ==================== АКТИВАЦИЯ (ACTIVATE) ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Woops SW: Удаление устаревшего кэша версии:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== ОБРАБОТКА ЗАПРОСОВ (FETCH) ====================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Пропускаем внешние API и Firebase, чтобы не ломать сетевые запросы авторизации
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic') ||
      url.hostname.includes('ui-avatars.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Стратегия Stale-While-Revalidate (возврат из кэша мгновенно + обновление в фоне)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
  );
});

// Получение системных сигналов
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
