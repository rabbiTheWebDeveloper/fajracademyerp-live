// ─── Cache Version ────────────────────────────────────────────────────────────
// IMPORTANT: Bump this version string every time you deploy a new build.
// This forces the old cache to be deleted and all pages to be re-fetched.
const CACHE_VERSION = "v7";
const CACHE_NAME = `fajr-academy-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache on install
const PRE_CACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/logo.png",
  "/fajr-logo.png",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_ASSETS);
    })
  );
  // Don't call skipWaiting() here — wait for the client to trigger it
  // so we can show an "update available" banner first.
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Tell all open clients a new version is active
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SW_ACTIVATED", version: CACHE_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// ─── Message handler ─────────────────────────────────────────────────────────
// The app sends SKIP_WAITING when the user clicks "Update Now"
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, browser-extension, API requests, dev HMR, and localhost
  if (
    event.request.method !== "GET" ||
    url.protocol === "chrome-extension:" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("_next/webpack-hmr") ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1"
  ) {
    return;
  }

  // For navigate requests: network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache fresh page responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Network failed — serve cached version or offline page
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For static assets: cache-first strategy
  if (
    event.request.destination === "image" ||
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/teacher/class";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── Web Push Handler (for background / offline push) ─────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "⏰ ক্লাস রিমাইন্ডার", body: "আপনার পরবর্তী ক্লাসের সময় হয়েছে।", url: "/teacher/class" };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/fajr-logo.png",
    badge: "/fajr-logo.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/teacher/class",
    },
    actions: [
      { action: "join", title: "Join Class" },
      { action: "dismiss", title: "Close" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

