# Desafio Xtremo - Web

Sitio web de Desafio Xtremo. Cloudflare Pages (frontend estático, sin build) + Pages
Functions (backend serverless) + D1 (SQL) + KV (sesiones) + R2 (archivos), todo dentro
del free tier de Cloudflare.

- `frontend/`: sitio estático (HTML + CSS + JS vanilla, sin frameworks ni bundler).
- `functions/`: backend (Cloudflare Pages Functions). `functions/anuncios/[slug].js`
  renderiza en servidor la página de cada anuncio (para que las previsualizaciones de
  Discord/X tengan título, extracto e imagen reales).
- `backend/lib/`: librerías compartidas por las functions (sesiones, permisos, cuotas,
  caché, sanitización, validación de archivos...).
- `backend/migrations/`: migraciones de D1, en orden (`0001_init.sql`, `0002_content.sql`, ...).

## Frontend

Todas las páginas comparten los mismos tokens y el mismo shell:

| Archivo | Qué es |
|---|---|
| `css/tokens.css` | Paleta (sacada del logo), tipografía, botones, formularios, toasts, diálogos, Markdown renderizado. Lo carga todo. |
| `css/site.css` | Shell público: nav, menú móvil, footer, fondo ambiental, utilidades de animación. |
| `css/home.css` | La home: capítulos con animación por scroll, hotbar, toasts de logro. El mapa del evento es `assets/mapa.webp`. |
| `css/content.css` | Tarjetas de anuncios, feed, página de anuncio, wiki. |
| `css/app.css` | Shell de aplicación compartido por el panel (`admin.html`) y Dev Zone (`devzone.html`, tema morado vía `body.theme-dev`). |
| `css/devzone.css` | Tablero kanban, línea temporal de decisiones y lector de specs. |
| `js/site.js` | `window.DX`: sesión (una sola petición a `/api/auth/me` por página), toasts, diálogo de confirmación, fechas relativas, nav, cuenta. |
| `js/motion.js` | Motor de animación por scroll propio (`data-reveal`, `data-split`, `data-scene`, `data-fill`, `data-count`, `data-scramble`). |
| `js/pixel-icons.js` | Iconos pixel art dibujados a mano como SVG. |
| `js/app-ui.js` | `window.DXApp`: API con CSRF, router por hash, drawer de edición con aviso de cambios sin guardar, paleta `Ctrl+K`, editor Markdown con vista previa, gráfico. |

**El nav y el footer están repetidos en cada HTML público** (no hay build) **y en
`functions/anuncios/[slug].js`**. Si cambias uno, cambia todos. La home (`index.html`) es
la referencia.

Todas las animaciones respetan `prefers-reduced-motion` y la página se ve completa sin
JavaScript (clase `no-js` en `<html>`).

## Qué hay

- **Login con Discord** (OAuth) + sesiones en KV + CSRF de doble cookie en toda petición
  que escribe.
- **Rangos y permisos** (RBAC) gestionables desde el panel (`panel.manage_roles`), con
  **jerarquía**: solo se pueden crear, editar, asignar o retirar rangos por debajo del
  rango más alto propio, nunca los fijos (Owner/Co-Owner) salvo que tú tengas uno, y
  nunca conceder permisos que no tienes.
- **Wiki** en Markdown (`wiki.manage`), con buscador, índice "En esta página" y callouts
  (`> [!TIP]`, `[!NOTE]`, `[!WARNING]`, `[!DANGER]`).
- **Anuncios** (`announcements.manage`): editor Quill, portada, categorías, fijados, likes,
  página propia por anuncio, limpieza de imágenes huérfanas.
- **Equipo** (`team.manage`) con render de skin por UUID (vzge.me).
- **Sanciones** con pruebas en R2 privado (`sanctions.access` / `sanctions.manage`).
- **Estadísticas** sin cookies (`panel.view_stats`) y **monitor de uso** del free tier
  (`panel.view_usage`).
- **Dev Zone** (`devzone.access` para ver, `devzone.manage` para escribir): tablero kanban
  con arrastrar y soltar, decisiones (solo añadir, nunca editar) y specs por sistema.
- **Caché de borde** para los endpoints públicos de lectura frecuente (`/api/wiki`,
  `/api/announcements`, `/api/team`, páginas de anuncio), 2 min de TTL, con purga en cada
  escritura.

### Cuotas del free tier

`backend/lib/quota.js` lleva contadores propios de D1/KV/R2 y bloquea una petición antes
de gastar la última unidad gratuita. Los contadores viven en la tabla D1
`usage_counters` (migración `0009`) y se escriben por lotes desde memoria: **no** en KV,
que solo admite 1.000 escrituras al día. El rate limiting (`backend/lib/rateLimit.js`)
también es en memoria por el mismo motivo.

## Configuración en Cloudflare Pages (dashboard, no hay `wrangler.toml`)

Bindings (Settings → Functions): D1 → `DB`, KV → `SESSIONS`, R2 → `EVIDENCE` (privado) y
`MEDIA` (público, con dominio propio `media.desafioxtremo.site`).

Variables de entorno: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`,
`MEDIA_PUBLIC_URL`, y opcionalmente `ANALYTICS_SALT`.

Migraciones: se aplican a mano, en orden, desde la consola de D1 del dashboard. Después
de aplicar una con `CHECK` u otras restricciones, comprueba con
`SELECT sql FROM sqlite_master WHERE name='<tabla>'` que el texto llegó intacto.

## Desarrollo local

Con [Wrangler](https://developers.cloudflare.com/workers/wrangler/) instalado, desde esta
carpeta:

```
npx wrangler pages dev frontend --d1 DB --kv SESSIONS --r2 EVIDENCE --r2 MEDIA \
  --binding DISCORD_CLIENT_ID=x DISCORD_CLIENT_SECRET=x \
  DISCORD_REDIRECT_URI=http://127.0.0.1:8788/api/auth/callback MEDIA_PUBLIC_URL=http://127.0.0.1:8788/media
```

Eso levanta las Functions reales con una D1/KV/R2 locales y vacías (nada toca
producción). Aplica las migraciones sobre la base local y, como el login de Discord no
funciona en local, crea una sesión a mano en la KV local:

```
npx wrangler kv key put "sess:dev" '{"id":"<tu id de Discord>","username":"yo"}' --namespace-id SESSIONS --local
```

y en el navegador, en `http://127.0.0.1:8788`, ejecuta `document.cookie = "dx_session=dev; path=/"`.
