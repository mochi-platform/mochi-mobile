# Override Global de Planned

Ya no se trabaja con Turborepo. Mochi opera con repositorios individuales.

## Reglas obligatorias para `docs/mobile/planned/`

- Cada documento debe indicar el repo de ejecución (`mochi-mobile` o `mochi-web`).
- Si un documento depende de otro repo, debe marcarse como dependencia externa.
- No usar rutas heredadas de Turborepo (`apps/*`, `packages/*`, root compartido).
- Las rutas de archivos deben ser reales para el repo objetivo.
- Cambios de esquema (SQL/RLS/RPC) se modelan como migraciones Supabase compartidas.
- No asumir que un cambio de web se implementa en este workspace móvil.

## Convención recomendada por documento

1. Alcance de repositorio (override)
2. Aplicación del override en este documento
3. Plan técnico específico
4. Criterios de aceptación
