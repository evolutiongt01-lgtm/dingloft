# Dingloft · chat y sesiones de instalación remota

## Funciones nuevas

- El panel de Soporte conserva el envío de mensajes directos en tiempo real.
- Cada conversación permite agendar una instalación remota con fecha, hora, servicio y herramienta sugerida.
- La sesión también se registra en la colección `reservas`, enlazada al chat.
- El cliente ve una cuenta regresiva dentro del chat.
- El cliente puede escoger AnyDesk o Google Remote Desktop y enviar un código temporal.
- El empleado ve el método y el código en el panel, con un botón para copiarlo.
- La sesión puede marcarse como completada o cancelada desde el chat administrativo.
- El propietario puede crear, editar o desactivar empleados desde la sección `Equipo`.
- Cada reserva se asigna a un empleado y Zoho le envía un correo con la cita.
- Las citas muestran siempre el horario de Miami (`America/New_York`).
- La reserva admite monto en USD y método de pago; $0 se registra como cortesía.

## Seguridad

- La fecha, el empleado, el estado y la identidad del cliente se escriben exclusivamente mediante el Worker.
- El cliente autenticado solo puede elegir la herramienta y proporcionar el código de su propia sesión activa.
- Se aceptan únicamente códigos temporales con letras, números, espacios o guiones.
- Las reglas incluidas reconocen empleados activos, pero bloquean la creación o edición directa de empleados desde el navegador.

## Despliegue

1. Publicar todo el contenido del proyecto web.
2. Publicar el archivo `firestore.rules` incluido.
3. Reemplazar el Worker desplegado por `dingloft-worker-v3.10.0.js`.
4. Mantener las variables y secretos existentes del Worker.
