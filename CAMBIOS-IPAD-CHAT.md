# Corrección iPad y soporte general

## Diagnóstico

El shell móvil cargaba páginas `*.html` dentro de un iframe. El Service Worker interceptaba esas navegaciones y las convertía en redirecciones a rutas limpias, mientras Vercel también aplica `cleanUrls`. En Safari/WebKit de iPad esa cadena de navegación embebida puede fallar o dejar el iframe sin contenido. Había además dos dependencias innecesarias de WebKit reciente: `Array.prototype.at()` y el uso de `visualViewport` como variable global sin comprobar `window.visualViewport`.

## Cambios del sitio

- `dingloft-app.js`: los iframes del shell usan rutas limpias desde el inicio; conserva `embed=1`, query y hash. Se protege el acceso a `visualViewport`.
- `dingloft-mobile-chrome.js`: reemplaza `Array.at(-1)` por acceso compatible al último elemento.
- `account.html` y `dingloft-support-account.js`: el chat se presenta a cualquier cuenta autenticada y la compra queda como contexto opcional.
- `dingloft-support-admin.js`: muestra estado en línea/última conexión, última página y cuándo el cliente leyó el último mensaje.
- `firestore.rules`: una cuenta autenticada puede leer su propio chat y escribir únicamente su presencia temporal permitida. No amplía acceso a compras ni a conversaciones ajenas.
- `sw.js` y `pwa-runtime.js`: versiones incrementadas para entregar el shell corregido y renovar la caché PWA.

## Worker que debe desplegarse aparte

Desplegar `worker-support.js` como reemplazo del Worker actual. El cambio:

- crea acceso de soporte para toda cuenta Firebase autenticada;
- mantiene las compras solo como contexto opcional y no cambia derechos de descarga;
- sincroniza en el chat la última conexión, ruta/título, dispositivo y navegador;
- conserva `customerLastReadAt` al abrir/leer el chat;
- marca una experiencia como compra verificada solo cuando la cuenta realmente tiene una compra elegible.

También hay que publicar `firestore.rules` en Firebase. El Worker usa los mismos bindings y variables existentes; no agrega secretos ni migraciones destructivas.

## Despliegue recomendado

1. Publicar el sitio y `firestore.rules`.
2. Desplegar el Worker incluido.
3. En un iPad, cerrar todas las pestañas de Dingloft y abrir de nuevo. Si es PWA, aceptar la actualización cuando aparezca.
4. Probar Inicio, Catálogo, Cuenta y una ficha de producto; luego iniciar sesión con una cuenta sin compras, enviar un mensaje y verificar los tres datos de actividad en Administración > Soporte.

Checkout, pagos, compras, descargas, notificaciones, reseñas y reservas no se modificaron.
