# Mochi Mobile - Project Structure

Este proyecto ha sido limpiado de la estructura heredada de Turborepo. La nueva estructura es más simple y directa.

## Cambios Realizados

### Migraciones Completadas ✓

1. **Packages Integrados**
   - `packages/ai/` → `src/shared/lib/ai/`
   - `packages/supabase/` → `src/shared/lib/supabase/`
   - `packages/ui/` → `src/shared/components/ui/`
   - `packages/eslint-config/` → `config/eslint/`
   - `packages/typescript-config/` → `config/typescript/`

2. **Cambios en Imports**
   - Alias de TypeScript actualizados para apuntar a nuevas ubicaciones
   - Todos los imports de `@mochi/*` resuelven correctamente
   - Referencias a `@repo/*` eliminadas completamente

3. **Limpiezas de Turborepo**
   - ✓ Eliminada referencia a `eslint-plugin-turbo`
   - ✓ Removida carpeta `packages/` completamente
   - ✓ Actualizado `tsconfig.json` con nuevos alias
   - ✓ Removidas referencias `workspace:*` de `package.json`

## Estructura del Proyecto

```
mochi-mobile/
├── app/                           # Expo Router routes
├── src/
│   ├── app/                      # App screens (can be reorganized)
│   ├── core/                     # Providers, contexts
│   ├── features/                 # Feature-based components
│   ├── shared/
│   │   ├── components/
│   │   │   └── ui/              # UI components (Button, Card, Code)
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/
│   │   │   ├── ai/              # AI utilities (OpenRouter integration)
│   │   │   └── supabase/        # Supabase client & types
│   │   └── types/               # Shared type definitions
├── config/
│   ├── eslint/                   # ESLint configuration
│   └── typescript/               # TypeScript configuration
├── tsconfig.json                 # Updated with new alias paths
├── package.json                  # Cleaned, no workspace refs
└── pnpm-workspace.yaml          # Minimal workspace config
```

## Estilo de Código

### Imports Internos
Usa path aliases para claridad:

```typescript
// ✓ Bien
import { callAI } from '@mochi/ai'
import type { Profile } from '@mochi/supabase/types'
import { CustomAlert } from '@/src/shared/components'

// ✗ Evita
import { callAI } from '@mochi/ai/index'
import { callAI } from '../../lib/ai'
```

### Rutas de Archivos
Mantén la estructura organizada:

```
src/
├── app/                        # Screens/routes
├── features/[feature]/         # Feature-specific code
│   ├── components/
│   ├── hooks/
│   └── types/
└── shared/                     # Shared, reusable code only
    ├── components/
    ├── hooks/
    ├── lib/
    └── types/
```

## Comandos Comunes

```bash
# Instalar dependencias
pnpm install

# Tipo-revisar
pnpm typecheck

# Linter (una vez configurado)
pnpm lint

# Dev server
pnpm start
```

## Configuraciones

### TypeScript Alias (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@mochi/ai": ["src/shared/lib/ai"],
      "@mochi/ai/*": ["src/shared/lib/ai/*"],
      "@mochi/supabase": ["src/shared/lib/supabase"],
      "@mochi/supabase/*": ["src/shared/lib/supabase/*"]
    }
  }
}
```

## Notas Importantes

- ✓ Turborepo completamente removido
- ✓ Estructura simplificada para una app Expo
- ✓ Mejor organización de código compartido
- ✓ Imports claros sin referencias heredadas
- ⚠️ Algunos paths pueden necesitar ajustes dependiendo de otros imports en la app
