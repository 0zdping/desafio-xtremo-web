# Desafio Xtremo - Web

Sitio web de Desafio Xtremo. Cloudflare Pages (frontend estático) + Pages Functions
(backend serverless) + D1 (SQL) + KV + R2, todo dentro del free tier de Cloudflare.

- `frontend/` — sitio estático: home, wiki, tablón de anuncios, panel de administración.
- `functions/api/` — backend (Cloudflare Pages Functions).
- `backend/lib/` — librerías compartidas por las functions (sesiones, permisos, cuotas, etc).
- `backend/migrations/` — migraciones de D1, en orden (`0001_init.sql`, `0002_content.sql`, ...).

## Qué hay

- **Login con Discord** (OAuth) + sesiones en KV + protección CSRF de doble cookie en
  toda petición que escribe.
- **Rangos y permisos** (RBAC): dos equipos con rangos fijos de partida — Staff (Owner,
  Co-Owner, Community Manager, Admin, Mod, Helper) y Desarrollo (Developer, Builder) —
  gestionables desde el panel (`/admin.html`, permiso `panel.manage_roles`). Los rangos
  no están bloqueados salvo Owner/Co-Owner: se pueden renombrar, cambiar de color/orden y
  ajustar sus permisos libremente.
- **Wiki** editable desde el panel (permiso `wiki.manage`): páginas en Markdown
  agrupadas por categoría, con vista pública en `/wiki.html`.
- **Tablón de anuncios** editable desde el panel (`announcements.manage`): anuncios en
  Markdown, con opción de fijar, vista pública en `/anuncios.html` y un teaser en la home.
- **Equipo** editable desde el panel (`team.manage`): tarjetas con nick, rango (color
  libre), función y render de skin (vía `mc-heads.net`, sin coste propio), en la home.
- **Zona de sanciones** para todo el staff (`sanctions.access` para ver/registrar,
  `sanctions.manage` para borrar): registro de sanciones con pruebas (imágenes/vídeo)
  subidas a R2, servidas solo a staff autenticado (nunca por URL pública directa).
- **Monitor de uso** (`panel.view_usage`): contadores propios contra los límites del free
  tier (D1, KV, R2), que bloquean una petición *antes* de gastar la última unidad
  gratuita en vez de dejar que empiece a cobrarse.
- **Caché de borde** para lo que es de lectura muy frecuente y escritura rara (wiki,
  anuncios, equipo): los endpoints públicos (`/api/wiki`, `/api/announcements`,
  `/api/team`) se sirven desde la Cache API de Cloudflare (2 min de TTL) para que la
  inmensa mayoría de las visitas no gasten ni una fila de D1.

## Configuración necesaria en Cloudflare Pages (dashboard, no hay `wrangler.toml`)

Bindings del proyecto (Settings → Functions):
- D1 database → variable `DB`.
- KV namespace → variable `SESSIONS`.
- R2 bucket → variable `EVIDENCE` (**pendiente de crear** — solo hace falta para que la
  subida de pruebas de sanciones funcione; el resto del sitio funciona igual sin esto).
  1. Cloudflare dashboard → R2 → crear bucket (ej. `desafio-xtremo-evidence`).
  2. Proyecto Pages → Settings → Functions → R2 bucket bindings → variable `EVIDENCE`
     apuntando a ese bucket.

Variables de entorno: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`.

Migraciones: aplicar los `.sql` de `backend/migrations/` en orden sobre la base D1 del
proyecto (`wrangler d1 execute <db> --file=backend/migrations/0001_init.sql`, y así con
cada archivo nuevo).
