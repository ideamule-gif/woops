// ==========================================================================
// 🚀 SERVICE WORKER: УПРАВЛЕНИЕ КЭШОМ И ОФЛАЙН-РЕЖИМОМ (ВЕРСИЯ 3)
// ==========================================================================
const CACHE_NAME = 'woops-v3'; // Инкремент версии сбрасывает старый кэш у всех пользователей

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
        console.log('Woops SW: Кэширование обновленных адаптивных файлов');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Активируем SW сразу, не дожидаясь закрытия вкладок
  );
});

// ==================== АКТИВАЦИЯ (ACTIVATE) ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Woops SW: Удаление устаревшего кэша:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Перехватываем управление вкладками немедленно
  );
});

// ==================== ОБРАБОТКА ЗАПРОСОВ (FETCH) ====================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Важно: Пропускаем Firebase и внешние API, чтобы не ломать сетевые запросы
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic') ||
      url.hostname.includes('ui-avatars.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Стратегия Stale-While-Revalidate (возврат из кэша + обновление в фоне)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Кэшируем только успешные статические ответы
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => null);

        // Отдаем кэш для скорости, если он есть, иначе ждем сеть
        return cachedResponse || fetchPromise;
      })
  );
});

// Срочное обновление при получении команды из основного скрипта
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
