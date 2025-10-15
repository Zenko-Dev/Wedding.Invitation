# Invitación de boda — Frontend estático + Google Sheets backend

Proyecto listo para GitHub Pages (HTML/CSS/JS puros) con control de invitados y RSVP conectado a Google Sheets mediante Google Apps Script Web App. Zona horaria: America/Mexico_City.

## Estructura

- `index.html`: Página principal con secciones, animaciones y formulario RSVP.
- `assets/styles.css`: Estilos y animaciones (paleta dorado/blanco/negro).
- `assets/app.js`: Lógica de UI, countdown (22/11/2025), enlaces a calendario, control de token `?id=TOKEN` y envío RSVP.
- `assets/img/flourish.svg`: Adorno decorativo SVG.
- `gas/Code.gs`: API REST para Google Apps Script (CORS habilitado).
- `admin/sample_links.html`: Utilidad para generar links personalizados desde `Nombre, TOKEN`.

## Requisitos

- Frontend en GitHub Pages (o cualquier hosting estático).
- Backend sin servidor con Google Sheets + Google Apps Script.

## Backend: Google Sheets + Apps Script

1) Crea un Google Sheet y agrega una hoja llamada `Invitados` con columnas EXACTAS en este orden y nombre (fila 1):
   - A: `token`
   - B: `guestName`
   - C: `maxPasses`
   - D: `notes`
   - E: `attending`
   - F: `guestsCount`
   - G: `message`
   - H: `updatedAt`

2) En el Sheet, abre Extensiones > Apps Script. Crea un proyecto y pega el contenido de `gas/Code.gs`.

3) En Apps Script, configura la zona horaria del proyecto a `America/Mexico_City` (Project Settings) y despliega como Web App:
   - `Deploy > Test deployments > Web app`
   - `Who has access`: Anyone
   - Copia la URL del Web App (termina en `/exec`).

4) Genera tokens únicos para cada invitado:
   - Usa el menú `RSVP > Generar tokens (filas 2-101)` o ejecuta `generarTokens_(2, 101)` ajustando rangos.
   - Completa `Nombre` y `MaxInvitados` para cada invitación.

5) Prueba la API (endpoints REST):
   - Invitado: `GET {WEB_APP_URL}/guest?id=TOKEN`
     - Respuesta: `{ status:"ok"|"not_found"|"error", guestName, maxPasses, notes, attending, guestsCount, message, updatedAt, id }`
   - RSVP: `POST {WEB_APP_URL}/rsvp`
     - Body JSON: `{ "id":"TOKEN", "attending":true, "guestsCount":2, "message":"nos vemos!", "notes":"sin nueces" }`
     - Respuesta: `{ status:"ok" }` o `{ status:"not_found" }`

## Frontend: configurar y publicar

1) En `assets/app.js`, define tu URL real de Apps Script en `GAS_URL` (ej.: `https://script.google.com/macros/s/XXXXX/exec`).

2) Ajusta textos y datos en `index.html`:
   - Nombres de los novios: `index.html:21`
   - Fecha visible: `index.html:22` y horarios/mapas en bloques de eventos.
   - Direcciones y mapas (ceremonia y recepción): `index.html:96`, `index.html:111`
   - Mesa de regalos (Amazon): `index.html:130`
   - Lluvia de sobres (CLABE, banco, titular): `index.html:175`
   - Si cambias horarios, también en `assets/app.js` (EVENT y COUNTDOWN_TARGET).

3) Personaliza estilos en `assets/styles.css`.

4) Publica en GitHub Pages:
   - Settings > Pages > Build and deployment: desde branch `main`, carpeta root.
   - URL: `https://TU_USUARIO.github.io/TU_REPO/`

5) Comparte links personalizados:
   - Formato: `https://TU_USUARIO.github.io/TU_REPO/?id=TOKEN`
   - Usa `admin/sample_links.html` para componerlos desde una lista.
   - El sitio recuerda el token en `localStorage`.

## Flujo de RSVP

- El invitado entra con `?id=TOKEN`.
- El frontend valida contra Apps Script: nombre y `MaxInvitados`.
- El formulario se habilita; al enviar, guarda `Asistira`, `NumInvitados` y `Mensaje`.
- Si reabre el link, ve su respuesta prellenada.

## Seguridad y consideraciones

- No expongas datos sensibles en el frontend. Usa tokens suficientemente aleatorios.
- Puedes rotar tokens cambiándolos en la hoja.
- Si necesitas, bloquea cambios después de cierta fecha desde Apps Script.

## Personalización rápida

- Colores: `:root` en `assets/styles.css`.
- Fuentes: Google Fonts en `index.html:15`.
- Animaciones de aparición: `data-animate`.
- Secciones: duplica `section` según necesidades.
