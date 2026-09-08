# Migraciones Supabase — Halloween Movie Calendar

## Cómo ejecutar

1. Abre el [Dashboard de Supabase](https://supabase.com/dashboard) y selecciona tu proyecto.
2. Ve a **SQL Editor** → **New query**.
3. Pega el contenido de `001_calendar_entries.sql`.
4. Haz clic en **Run**.

## Qué crea

| Objeto | Descripción |
|--------|-------------|
| `public.calendar_entries` | Tabla con una fila por día de octubre (31 filas, `date_key` único) |
| RLS policies `anon` | Select / Insert / Update permitidos sin login (diseño intencional, sin datos sensibles) |
| Realtime | La tabla se agrega a `supabase_realtime` para sincronización en vivo |
| `set_updated_at()` + trigger | Actualiza `updated_at` automáticamente en cada UPDATE |

## Notas

- La app usa la **publishable key** (anon), nunca la service role key.
- RLS está habilitado; las policies `anon` son la única vía de acceso desde el frontend.
- Si el proyecto se pausa (plan free, 7 días inactivo), reactívalo desde el Dashboard antes de usar la app.