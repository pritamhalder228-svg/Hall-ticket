const CACHE_NAME = 'hall-ticket-v4';

self.addEventListener('install', event => {
  self.skipWaiting(); // জোর করে আগের জেদি ক্যাশ সরিয়ে নতুনটা চালু করবে
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // শুধু মূল ফাইলগুলো ক্যাশ করবে, যাতে কোনোভাবেই ফেইল না হয়
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // পুরোনো জঞ্জাল মুছে ফেলবে
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // ১. যদি ক্যাশে থাকে, সরাসরি সেখান থেকে দিয়ে দেবে (ইন্টারনেট ছাড়া)
      if (cachedResponse) {
        return cachedResponse;
      }

      // ২. ক্যাশে না থাকলে ইন্টারনেট থেকে নামাবে এবং সাথে সাথে ক্যাশে সেভ করে নেবে
      return fetch(event.request).then(networkResponse => {
        // ফায়ারবেস বা অন্য ডেটা ছাড়া শুধু কাজের জিনিসগুলো সেভ করবে
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // ৩. অফলাইনে থাকা অবস্থায় কিছু লোড না হলে অন্তত মেইন পেজটা চালু রাখবে
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
