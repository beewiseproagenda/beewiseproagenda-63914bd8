// [BW][PWA_UPDATE] Service Worker com versionamento automático
const SW_VERSION = 'v1-' + new Date().toISOString();
const STATIC_CACHE_NAME = 'beewise-static-' + SW_VERSION;
const DYNAMIC_CACHE_NAME = 'beewise-dynamic-' + SW_VERSION;

console.log('[BW][PWA_UPDATE] SW Version:', SW_VERSION);

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png'
];

// Install event - ativação imediata
self.addEventListener('install', (event) => {
  console.log('[BW][PWA_UPDATE] Installing new SW:', SW_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[BW][PWA_UPDATE] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[BW][PWA_UPDATE] Static assets cached, activating immediately');
        // Ativação imediata do novo SW
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[BW][PWA_UPDATE] Error caching:', error);
      })
  );
});

// Activate event - assumir controle imediato
self.addEventListener('activate', (event) => {
  console.log('[BW][PWA_UPDATE] Activating SW:', SW_VERSION);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Deletar caches antigos
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[BW][PWA_UPDATE] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[BW][PWA_UPDATE] SW activated, claiming clients');
        // Assumir controle de todos os clientes imediatamente
        return self.clients.claim();
      })
      .then(() => {
        // Notificar todos os clientes sobre a nova versão
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: SW_VERSION
            });
          });
        });
      })
  );
});

// Fetch event - estratégia de cache otimizada
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);

  // Network-first para HTML (shell do app)
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache a nova versão do HTML
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback para cache apenas se offline
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // Assets com hash (JS/CSS com hash no nome) - cache agressivo
  if (url.pathname.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          });
        })
    );
    return;
  }

  // Assets estáticos - cache-first com revalidação em background
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return networkResponse;
            });
          
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // Outros recursos - network-first com cache de fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[BW][PWA_UPDATE] Background sync:', event.tag);
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[BW][PWA_UPDATE] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do BeeWise',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir App',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('BeeWise', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[BW][PWA_UPDATE] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle message events from the main thread
self.addEventListener('message', (event) => {
  console.log('[BW][PWA_UPDATE] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({
      version: SW_VERSION
    });
  }
});
