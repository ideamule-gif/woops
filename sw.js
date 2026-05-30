const CACHE_NAME = 'woops-v2'; // увеличиваем версию при обновлении

const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  // Иконки (добавь свои)
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ==================== INSTALL ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Woops: Кэшируем статические файлы');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Woops: Удаляем старый кэш:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Пропускаем Firebase и внешние запросы (они должны идти по сети)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Стратегия Stale-While-Revalidate для статических файлов
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Возвращаем кэш сразу, а в фоне обновляем
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Кэшируем только успешные ответы
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

// Обновление при новом контенте
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
