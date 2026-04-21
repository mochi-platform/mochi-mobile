# Override Global de Planned (Web)

Mochi opera con repositorios individuales.

## Reglas obligatorias para `docs/web/planned/`

- Cada documento debe indicar que el repo de ejecución es `mochi-web`.
- Si un documento requiere cambios en `mochi-mobile`, debe marcarse como dependencia externa.
- No usar rutas heredadas de Turborepo (`apps/*`, `packages/*`, root compartido).
- Cambios de esquema (SQL/RLS/RPC) se modelan como migraciones Supabase compartidas.
