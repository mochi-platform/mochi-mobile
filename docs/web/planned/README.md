# Índice de documentos planned — Mochi Web

## Alcance de repositorio (override)

- Este índice corresponde a `mochi-web`.
- Los documentos móviles viven en `docs/mobile/planned/`.

## Documentos

| Doc | Descripción | Estado |
|---|---|---|
| `admin-dashboard.md` | Dashboard admin para Doménica (CRUD de voucher templates + stats) | Planificado |

## Dependencia compartida

- Los cambios de esquema (SQL/RLS/RPC) se ejecutan vía migraciones Supabase compartidas.
- `mochi-mobile` consume los cambios de datos, pero no implementa la UI admin.
