# Corrección iPad y soporte general

## Diagnóstico

El shell móvil cargaba páginas `*.html` dentro de un iframe. El Service Worker interceptaba esas navegaciones y las convertía en redirecciones a rutas limpias, mientras Vercel también aplica `cleanUrls`. En Safari/WebKit de iPad esa cadena de navegación embebida puede fallar o dejar el iframe sin contenido. Había además dos dependencias innecesarias de WebKit reciente: `Array.prototype.at()` y el uso de `visualViewport` como variable global sin comprobar `window.visualViewport`.

## Cambios del sitio

- `dingloft-app.js`: los iframes del shell usan rutas limpias desde el inicio; conserva `embed=1`, query y hash. Se protege el acceso a `visualViewport`.
- `dingloft-mobile-chrome.js`: reemplaza `Array.at(-1)` por acceso compatible al último elemento.
- `account.html` y `dingloft-support-account.js`: el chat se presenta a cualquier cuenta autenticada y la compra queda como contexto opcional.
- `dingloft-support-admin.js`: muestra estado en línea/última conexión, última página y cuándo el cliente leyó el último mensaje.
- `dingloft-support-admin.js`: corrige Activar avisos obteniendo y registrando un token de Firebase Messaging, el formato que utiliza el Worker.
- `firestore.rules`: una cuenta autenticada puede leer su propio chat y escribir únicamente su presencia temporal permitida. No amplía acceso a compras ni a conversaciones ajenas.
- `sw.js` y `pwa-runtime.js`: versiones incrementadas para entregar el shell corregido y renovar la caché PWA.
- `dingloft-customer-push.js`: invitación contextual y profesional después de agregar productos al carrito. El permiso final siempre lo muestra el sistema operativo; no se imita ni se suplanta su interfaz.
- `dingloft-ui-guard.js`: activa el módulo de avisos en páginas de clientes y lo excluye del panel administrativo.
- `dingloft-commerce.js`: al completar una compra vacía también el carrito remoto para detener recordatorios pendientes.
- `sw.js`: presenta los avisos como notificaciones nativas de Dingloft y abre el carrito al tocarlas.

## Worker que debe desplegarse aparte

Desplegar `worker-support.js` como reemplazo del Worker actual. El cambio:

- crea acceso de soporte para toda cuenta Firebase autenticada;
- mantiene las compras solo como contexto opcional y no cambia derechos de descarga;
- sincroniza en el chat la última conexión, ruta/título, dispositivo y navegador;
- conserva `customerLastReadAt` al abrir/leer el chat;
- marca una experiencia como compra verificada solo cuando la cuenta realmente tiene una compra elegible.
- registra, después del consentimiento, el dispositivo del cliente en `customerPushTokens`;
- sincroniza el estado mínimo del carrito en `customerCarts` sin modificar pedidos, pagos ni derechos de descarga;
- envía como máximo dos recordatorios de carrito: el primero tras 2 horas y el segundo tras 24 horas;
- deja de enviar recordatorios cuando el carrito se vacía o la compra termina.

También hay que publicar `firestore.rules` en Firebase. El Worker usa los mismos bindings y variables existentes; no agrega secretos ni migraciones destructivas. Para los avisos, `FCM_VAPID_PUBLIC_KEY` debe contener la clave Web Push pública del mismo proyecto Firebase `login-dingloft`.

El Worker necesita un disparador programado de Cloudflare, recomendado cada hora. Si ya existe el disparador usado por la limpieza automática del chat, no hay que crear otro: la misma ejecución procesa ambos trabajos.

En iPhone y iPad, las notificaciones web requieren iOS/iPadOS 16.4 o posterior y que Dingloft esté instalado en la pantalla de inicio. En Android y computadoras compatibles funcionan desde el navegador o desde la PWA después del permiso oficial.

## Despliegue recomendado

1. Publicar el sitio y `firestore.rules`.
2. Desplegar el Worker incluido.
3. En un iPad, cerrar todas las pestañas de Dingloft y abrir de nuevo. Si es PWA, aceptar la actualización cuando aparezca.
4. Probar Inicio, Catálogo, Cuenta y una ficha de producto; luego iniciar sesión con una cuenta sin compras, enviar un mensaje y verificar los tres datos de actividad en Administración > Soporte.

Checkout, pagos, compras, descargas, notificaciones, reseñas y reservas no se modificaron.
