const CACHE_NAME = 'woops-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// 📦 Установка: Кэшируем статические файлы приложения
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Кэширование статических файлов');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      console.log('[Service Worker] Пропускаем ожидание');
      return self.skipWaiting();
    })
  );
});

// 🧹 Активация: Очищаем старый кэш при обновлении версии
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Удаление старого кэша:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Захват контроля над клиентами');
      return self.clients.claim();
    })
  );
});

// 🌐 Перехват запросов: Стратегия "Сначала кэш, затем сеть" для статики
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Пропускаем внешние запросы (Firebase, API, аватары), обслуживаем их напрямую из сети
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('dicebear') ||
    url.hostname.includes('mixkit')
  ) {
    event.respondWith(fetch(event.request));
    return;
    }

  // Для локальных ресурсов используем стратегию Cache First с обновлением в фоне (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Если сеть недоступна, возвращаем null (будет использован кэш)
        return null;
      });

      // Возвращаем кэш сразу, если он есть, иначе ждем сеть
      return cachedResponse || fetchPromise;
    })
  );
});

// 🔄 Обновление Service Worker по команде из интерфейса
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ========================================================
   🔔 ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ И КЛИКОВ (BACKGROUND)
   ======================================================== */

// 1. Прием push-уведомления от сервера (когда вкладка закрыта или свернута)
self.addEventListener('push', (event) => {
  let data = { 
    title: 'Woops Messenger', 
    body: 'У вас новое уведомление!' 
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Woops Messenger', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" fill="%236366f1" rx="40"/%3E%3Ctext x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="80" fill="white" font-family="sans-serif"%3EW%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" fill="%236366f1" rx="40"/%3E%3Ctext x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="80" fill="white" font-family="sans-serif"%3EW%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'open', title: 'Открыть Woops' }
    ],
    tag: 'woops-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 2. Обработка клика по уведомлению на экране устройства
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || './index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Ищем уже открытую вкладку с приложением
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url !== targetUrl) {
            return client.navigate(targetUrl).then((c) => c.focus());
          }
          return client.focus();
        }
      }
      
      // Если ни одной вкладки мессенджера не открыто, запускаем новую
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
