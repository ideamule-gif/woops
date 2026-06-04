const CACHE_NAME = 'woops-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Установка: Кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Woops: Кэшируем статические файлы');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Активация: Чистим старый кэш
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Woops: Удаляем старый кэш:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Пропускаем Firebase и внешние запросы
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic') ||
      url.hostname.includes('dicebear')) {
    event.respondWith(fetch(event.request));
    return;
  }

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
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// Обновление SW из интерфейса
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


/* ======================================================== */
/* 🔔 ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ И КЛИКОВ (BACKGROUND)       */
/* ======================================================== */

// 1. Прием push-уведомления от сервера (когда вкладка закрыта/свернута)
self.addEventListener('push', (event) => {
  let data = { title: 'Woops', body: 'Новое уведомление в мессенджере!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Woops', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=woops&backgroundColor=6366f1', 
    badge: './manifest.json', // Иконка для статус-бара (опционально)
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/' // Куда перенаправить пользователя при клике
    },
    actions: [
      { action: 'open', title: 'Открыть Woops' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 2. Обработка клика по уведомлению на экране телефона/ПК
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Сразу закрываем шторку уведомления

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    // Ищем, открыта ли уже вкладка с нашим приложением
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Если вкладка найдена, фокусируемся на ней и переводим на нужный URL
        if ('focus' in client) {
          if (client.url !== targetUrl) {
            return client.navigate(targetUrl).then(c => c.focus());
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
