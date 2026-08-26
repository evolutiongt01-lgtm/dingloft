/* Dingloft Support Push Service Worker · v105
   Standards-based push handler for iOS/iPadOS PWA + desktop.
   FCM registration happens in admin page; this worker only receives and displays.
*/

function supportPayload(event) {
  if (!event.data) return null;
  try {
    const payload = event.data.json();
    const data = payload?.data || {};
    const notification = payload?.notification || {};
    if (data.kind !== 'dingloft_support' && !notification.title && !data.title) return null;
    return { payload, data, notification };
  } catch (_) {
    return null;
  }
}

self.addEventListener('push', event => {
  const parsed = supportPayload(event);
  if (!parsed) return;

  const { data, notification } = parsed;
  const title = data.title || notification.title || 'Dingloft · Soporte';
  const body = data.body || notification.body || 'Nuevo mensaje de soporte.';
  const chatId = String(data.chatId || '');
  const url = data.url || `/admin.html${chatId ? `?supportChat=${encodeURIComponent(chatId)}` : ''}#support`;

  event.waitUntil((async () => {
    // WebKit requires every received push to result in a visible notification.
    await self.registration.showNotification(title, {
      body,
      icon: '/img/favicon.png',
      badge: '/img/favicon.png',
      tag: `dingloft-support-${chatId || 'new'}`,
      renotify: true,
      data: { url, chatId, kind: 'dingloft_support' }
    });

    // Inform any open admin windows as a convenience; notification remains visible on iOS.
    const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of windows) {
      try { client.postMessage({ type:'DINGLOFT_SUPPORT_PUSH', data }); } catch (_) {}
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification?.data?.url || '/admin.html#support', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        if (current.origin === self.location.origin && /\/admin(?:\.html)?$/i.test(current.pathname)) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      } catch (_) {}
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
