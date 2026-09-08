# 🎃 Halloween Movie Calendar

Calendario de películas de Halloween: 31 días de octubre, cada día una película. Dos personas comparten el estado (películas, vistas, calificaciones y notas) sin necesidad de login, sincronizado en tiempo real con Supabase. Las películas vienen de la API de TMDB.

**URL de producción (GitHub Pages):** https://santiago-molina-mdc.github.io/halloween-movie-calendar/

---

## 1. Qué es el proyecto

Una app estática de una sola página con dos vistas:

- **Landing** (`/`): hero con la propuesta "31 noches. 31 películas."
- **Calendario** (`/calendar`): grid de 31 tarjetas (una por día de octubre). Cada día permite elegir una película, marcarla como vista, calificarla (1–5 estrellas por persona) y escribir notas por persona.

Dos personas (Persona 1 y Persona 2) comparten el mismo calendario. No hay login: cada persona elige su identidad al entrar y los cambios se sincronizan vía Supabase Realtime.

## 2. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite + React 18 + TypeScript |
| Routing | react-router-dom con **HashRouter** (seguro para GitHub Pages, sin fallback 404) |
| Estilos | CSS plano con variables CSS (sin Tailwind) |
| Películas | TMDB API v3 (Bearer Read Access Token) |
| Estado compartido | Supabase (Postgres + Realtime), publishable key |
| Deploy | GitHub Pages vía `gh-pages` |

## 3. Instalación

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # build de producción (tsc + vite)
npm run preview    # previsualizar el build en http://localhost:4173
npm run deploy     # publicar en GitHub Pages (rama gh-pages)
```

## 4. TMDB (API de películas)

1. Crea una cuenta en https://www.themoviedb.org
2. Ve a https://www.themoviedb.org/settings/api
3. Crea una API key → copia el **"API Read Access Token"** (v4)
4. Pega el token en `VITE_TMDB_READ_ACCESS_TOKEN` (ver sección 6)

Notas:

- Gratis para uso no comercial.
- Límite aproximado de 40–50 requests/segundo por IP, sin SLA.
- La atribución a TMDB es obligatoria (ya incluida en el footer de la app).
- El token es seguro en el frontend: TMDB lo permite con rate-limit por IP y CORS habilitado.

## 5. Supabase (estado compartido)

El proyecto ya existe para este usuario. Solo necesitas:

1. **URL**: `https://xsbhthcxjyiwmjhdryzi.supabase.co`
2. **Publishable key**: Dashboard → Settings → API → `anon public` key

Pega ambos en las variables de entorno (sección 6).

Luego ejecuta la migración:

1. Dashboard → **SQL Editor** → New query
2. Pega el contenido de `supabase/migrations/001_calendar_entries.sql`
3. **Run**

La migración crea la tabla `calendar_entries`, habilita RLS con policies `anon` (select/insert/update), agrega la tabla a Realtime y crea el trigger de `updated_at`.

Notas del plan free:

- 500 MB de base de datos.
- El proyecto se pausa tras 7 días de inactividad (reactívalo desde el Dashboard).
- Realtime: 200 conexiones simultáneas.

## 6. Variables de entorno

```bash
cp .env.example .env.local
```

Llena `.env.local`:

```
VITE_TMDB_READ_ACCESS_TOKEN=tu_token_aqui
VITE_SUPABASE_URL=https://xsbhthcxjyiwmjhdryzi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key_aqui
```

⚠️ **NUNCA** uses la service role key ni la contraseña de la base de datos. La publishable key está diseñada para exponerse en el frontend.

Si las variables faltan, la app funciona en **modo demo** (solo localStorage) y muestra un banner de aviso.

## 7. Deploy en GitHub Pages

1. El repositorio debe ser **público**.
2. Build + deploy:

```bash
npm run build
npm run deploy
```

3. En GitHub: Settings → Pages → Source → **Deploy from a branch** → rama `gh-pages` → Save.

La app quedará en: `https://santiago-molina-mdc.github.io/halloween-movie-calendar/`

## 8. Uso

1. Abre la app → elige **Persona 1** o **Persona 2**.
2. Haz clic en un día del calendario.
3. **Elegir película**: busca por título o usa las categorías (Terror actual, Clásicos, 80s/90s/2000s, Slasher, Vampiros, Zombies, Sobrenatural, Recomendaciones, Clásicos de Halloween).
4. Marca **✓ Vista** cuando la veas.
5. Califica con estrellas (1–5) y escribe notas — cada persona tiene las suyas.
6. Los cambios se sincronizan automáticamente; usa **🔄 Sincronizar** para forzar una actualización.

## 9. Seguridad

- **Sin login**: el diseño es intencional. RLS permite `select/insert/update` anónimo sobre `calendar_entries` (no hay datos sensibles).
- La publishable key expuesta es segura por diseño: solo permite operaciones permitidas por las policies RLS.
- Nunca se incluyen claves reales en el código; solo en `.env.local` (ignorado por git).

## 10. Estructura de carpetas

```
halloween-movie-calendar/
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example
├── .nojekyll
├── supabase/
│   └── migrations/
│       ├── 001_calendar_entries.sql
│       └── README.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── config.ts
    ├── types.ts
    ├── styles/global.css
    ├── utils/date.ts, stats.ts
    ├── hooks/usePersona.ts, useCalendar.ts, useMovies.ts
    ├── services/tmdb.ts, supabase.ts
    ├── components/
    │   ├── Hero.tsx
    │   ├── PersonaPicker.tsx
    │   ├── StatsBar.tsx
    │   ├── FilterTabs.tsx
    │   ├── CalendarGrid.tsx
    │   ├── DayCard.tsx
    │   ├── MovieModal.tsx
    │   ├── DayDetailModal.tsx
    │   ├── ErrorState.tsx
    │   ├── Footer.tsx
    │   └── SyncButton.tsx
    └── pages/
        ├── LandingPage.tsx
        └── CalendarPage.tsx
```