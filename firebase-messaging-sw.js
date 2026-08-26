/* Dingloft Support Push Service Worker · FCM v1 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAKxQdUM49cVbBaXWJ5DF3s7EaNKlJRGhA',
  authDomain: 'login-dingloft.firebaseapp.com',
  projectId: 'login-dingloft',
  storageBucket: 'login-dingloft.firebasestorage.app',
  messagingSenderId: '549466738202',
  appId: '1:549466738202:web:8bf305fe2c753e9d76cba3'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || 'Dingloft · Soporte';
  const options = {
    body: data.body || 'Nuevo mensaje de soporte.',
    icon: '/img/favicon.png',
    badge: '/img/favicon.png',
    tag: `dingloft-support-${data.chatId || 'new'}`,
    renotify: true,
    data: {
      url: data.url || '/admin.html#support',
      chatId: data.chatId || ''
    }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification?.data?.url || '/admin.html#support', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        if (current.origin === self.location.origin && current.pathname.endsWith('/admin.html')) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      } catch (_) {}
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
