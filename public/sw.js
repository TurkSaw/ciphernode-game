// Service Worker for CipherNode Game PWA
// Online-only multiplayer game - minimal caching for performance only
const CACHE_NAME = 'ciphernode-v1.0.0';

// Only cache essential static files for faster loading
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/socket.io/socket.io.js',
  // Icons for PWA
  '/icons/icon-72x72.svg',
  '/icons/icon-96x96.svg',
  '/icons/icon-128x128.svg',
  '/icons/icon-144x144.svg',
  '/icons/icon-152x152.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-384x384.svg',
  '/icons/icon-512x512.svg'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - network-first for online game
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests - always try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses for faster subsequent loads
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, show connection error
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>CipherNode - Connection Error</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  background: #0a0a0f; 
                  color: #f8fafc; 
                  text-align: center; 
                  padding: 50px 20px; 
                }
                .error-container { max-width: 400px; margin: 0 auto; }
                .error-icon { font-size: 60px; margin-bottom: 20px; }
                .error-title { color: #ef4444; font-size: 24px; margin-bottom: 16px; }
                .error-message { color: #94a3b8; margin-bottom: 30px; }
                .retry-btn { 
                  background: #00ff88; 
                  color: #0a0a0f; 
                  border: none; 
                  padding: 12px 24px; 
                  border-radius: 8px; 
                  cursor: pointer; 
                  font-weight: 600;
                }
              </style>
            </head>
            <body>
              <div class="error-container">
                <div class="error-icon">🌐</div>
                <h1 class="error-title">Connection Required</h1>
                <p class="error-message">CipherNode is an online multiplayer game that requires an internet connection.</p>
                <button class="retry-btn" onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
            </html>`,
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            }
          );
        })
    );
    return;
  }

  // Handle API requests - always require network for online game
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ 
              error: 'Online connection required for multiplayer features.' 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle Socket.IO requests - always require network
  if (url.pathname.startsWith('/socket.io/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response('', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // Handle static resources - cache-first for better performance
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          // Update cache in background for next time
          fetch(request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  });
              }
            })
            .catch(() => {
              // Ignore background update errors
            });
          
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Cache successful responses for faster loading
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // Network failed and no cache - return offline page for HTML requests
            if (request.headers.get('accept').includes('text/html')) {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>CipherNode - Offline</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { 
                      font-family: Arial, sans-serif; 
                      background: #0a0a0f; 
                      color: #f8fafc; 
                      text-align: center; 
                      padding: 50px 20px; 
                    }
                    .error-container { max-width: 400px; margin: 0 auto; }
                    .error-icon { font-size: 60px; margin-bottom: 20px; }
                    .error-title { color: #ef4444; font-size: 24px; margin-bottom: 16px; }
                    .error-message { color: #94a3b8; margin-bottom: 30px; }
                    .retry-btn { 
                      background: #00ff88; 
                      color: #0a0a0f; 
                      border: none; 
                      padding: 12px 24px; 
                      border-radius: 8px; 
                      cursor: pointer; 
                      font-weight: 600;
                    }
                  </style>
                </head>
                <body>
                  <div class="error-container">
                    <div class="error-icon">📡</div>
                    <h1 class="error-title">You're Offline</h1>
                    <p class="error-message">CipherNode requires an internet connection for multiplayer features.</p>
                    <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
                  </div>
                </body>
                </html>`,
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
            
            // For other requests, return a generic error
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Push notification handler (for future energy notifications)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Your energy is full! Ready to hack?',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'play',
        title: 'Play Now',
        icon: '/icons/icon-96x96.svg'
      },
      {
        action: 'close',
        title: 'Later',
        icon: '/icons/icon-96x96.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CipherNode Game', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();

  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Update available notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});