# Índice de documentos planned — Mochi

## Alcance de repositorio (override)

- Estos documentos se mantienen bajo un modelo de repositorios individuales (sin Turborepo).
- Este repositorio cubre `mochi-mobile`; cualquier tarea de web se implementa en su repo (`mochi-web`) y se coordina por contrato de Supabase.

## Prioridad de implementación

### 🔴 Alta — bugs que afectan funcionalidad o calidad del código

| Doc | Descripción | Esfuerzo |
|---|---|---|
| `bugfix-recovery-sprint-screens.md` | Eliminar emojis, gradientes web, copy en inglés y Pressable en RecoveryPlanModal, SprintTracker y exam-sprint-progress | Bajo |
| `cycle-phase-type-unification.md` | Eliminar cast inseguro y fuente de verdad duplicada de CyclePhase | Bajo |
| `copilot-instructions-update.md` | Schema actualizado, notas de CyclePhase, eliminar plugin duplicado | Bajo |

### 🟠 Media — features incompletas que tienen infraestructura pero no UI

| Doc | Descripción | Esfuerzo |
|---|---|---|
| `quick-capture-implementation.md` | Conectar QuickCaptureModal a Supabase + agregar FAB en home | Medio |
| `energy-level-logging.md` | UI para registrar nivel de energía (integrar en mood.tsx) | Medio |
| `android-widget-verification.md` | Verificar que el widget iOS no crashea en Android; documentar estado | Bajo |

### 🟡 Estratégica — features nuevas planificadas

| Doc | Descripción | Esfuerzo |
|---|---|---|
| `admin-dashboard.md` | Dashboard web para Doménica — CRUD de voucher_templates + stats | Alto |
| `shared-space-pareja.md` | Mochi Duo: dinámica mujer + pareja con panel reducido para él (metas, vales y snapshot de ciclo/rendimiento), 100% gratis | Alto |
| `play-store-launch.md` | Checklist técnico + configuración para lanzamiento en Play Store | Medio |

---

## Monetización (documentos existentes)

Estos documentos ya existen en `docs/planned/` y están completos:

- `ai-tokens-ads.md` — Sistema de créditos IA via rewarded ads
- `premium-subscription.md` — RevenueCat + Google Play Billing

---

## Orden de implementación sugerido

```
Semana 1:
  1. bugfix-recovery-sprint-screens.md      (1-2 horas)
  2. cycle-phase-type-unification.md        (30 min)
  3. copilot-instructions-update.md         (30 min)

Semana 2:
  4. energy-level-logging.md               (2-3 horas)
  5. quick-capture-implementation.md        (3-4 horas)
  6. android-widget-verification.md         (1 hora)

Semanas 3-4:
  7. admin-dashboard.md                    (1 semana)
  8. play-store-launch.md                  (paralelo a admin)

Fase siguiente:
  9. shared-space-pareja.md (Mochi Duo)    (2+ semanas)
  10. ai-tokens-ads.md                     (cuando se decida monetizar)
  11. premium-subscription.md              (cuando se decida monetizar)
```

---

## Convenciones para usar estos docs con Copilot

Cada documento está diseñado para ser leído por el agente `@mochi-dev` o `@mochi-database`
antes de implementar. El flujo recomendado:

```
1. Leer el doc completo del feature a implementar
2. Verificar schema con execute_sql si hay tablas nuevas
3. Implementar siguiendo las reglas de copilot-instructions.md
4. Pasar por @mochi-reviewer antes de mergear
```

Los docs incluyen:
- Código de ejemplo TypeScript listo para adaptar
- SQL completo con RLS y GRANTs
- Lista exacta de archivos a modificar
- Criterios de aceptación verificables
