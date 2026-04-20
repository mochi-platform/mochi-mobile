# Créditos de IA por anuncios recompensados

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Aplicación del override en este documento

- Implementación de UI y lógica cliente: solo `mochi-mobile`.
- Las funciones SQL/RPC se crean como migraciones Supabase compartidas.
- No se requiere dashboard web ni cambios en `mochi-web` para el MVP.

## Resumen
Implementar un sistema de créditos de IA donde la usuaria obtiene créditos al completar anuncios recompensados.

Regla inicial sugerida:
- Máximo 5 anuncios recompensados por día por usuaria.
- Cada anuncio válido otorga 1 crédito de IA.
- Cada acción de IA consume 1 crédito.

Objetivo:
- Controlar costos de IA en el plan gratuito.
- Mantener la experiencia sin bloqueo total para usuarias sin suscripción.
- Incentivar uso activo con una mecánica clara y justa.

Alcance de este documento:
- Solo anuncios recompensados y créditos derivados de anuncios.
- El plan de suscripciones premium se documenta por separado en otro archivo.

## Alcance funcional
La primera versión cubre:
- Mostrar saldo de créditos disponibles.
- Permitir ganar créditos viendo anuncios recompensados.
- Aplicar límite diario de anuncios.
- Consumir crédito antes de ejecutar una operación de IA.
- Informar cuando la usuaria no tenga créditos.

No cubre:
- Gestión de suscripciones, pagos y entitlements premium.

## Puntos de integración de IA detectados en el proyecto
Flujos que consumen IA y deben pasar por control de créditos:
- Generación de recetas.
- Compañera de estudio (chat y ayuda contextual).
- Resumen semanal con mensaje de IA.
- Conversión de nota rápida a acción.

## Arquitectura recomendada
### 1) Modelo seguro
Control server-side con Supabase para evitar bypass desde cliente.

Principio:
- El cliente no decide saldo ni consumo final.
- El backend valida recompensas y consumo de forma atómica.

### 2) Flujo de recompensa por anuncio
1. La usuaria pulsa "Ver anuncio".
2. Se muestra rewarded ad en Android.
3. Al completar recompensa:
   - Cliente solicita reclamo al backend.
   - Backend valida límite diario e idempotencia.
   - Backend agrega +1 crédito al ledger.
4. Cliente refresca saldo.

### 3) Flujo de consumo de crédito en IA
1. Antes de invocar IA, cliente solicita consumo de 1 crédito al backend.
2. Backend valida saldo > 0 y registra delta=-1.
3. Solo si el consumo fue exitoso se ejecuta la llamada a OpenRouter.
4. Se registra auditoría del uso.

## Modelo de datos (Supabase)
### Tabla: ai_credits_ledger
Registro inmutable de todos los movimientos de créditos.

Campos sugeridos:
- id (uuid, pk)
- user_id (uuid, fk -> auth.users)
- delta (int, positivo o negativo)
- reason (text: ad_reward, ai_recipe, ai_chat, ai_summary, ai_note_to_action)
- source_ref (text nullable)
- metadata (jsonb)
- created_at (timestamptz)

Reglas sugeridas:
- No permitir updates/deletes desde cliente.
- Insert solo vía RPC o función segura.

### Tabla: ai_ad_rewards_daily
Control de anuncios recompensados por día para enforcing de límites.

Campos sugeridos:
- id (uuid, pk)
- user_id (uuid)
- day_key (date)
- ad_network (text)
- ad_unit_id (text)
- reward_event_id (text único por evento)
- rewarded_at (timestamptz)
- created_at (timestamptz)

Índices y restricciones sugeridas:
- unique(user_id, reward_event_id)
- índice por (user_id, day_key)

## RPC/Funciones recomendadas
### claim_ai_credit_from_ad(...)
Responsabilidades:
- Verificar identidad de usuaria autenticada.
- Verificar límite diario.
- Verificar idempotencia por reward_event_id.
- Insertar evento de recompensa.
- Insertar delta=+1 en ledger.
- Retornar saldo actual y anuncios restantes del día.

### consume_ai_credit(...)
Responsabilidades:
- Calcular saldo disponible.
- Rechazar si saldo <= 0.
- Insertar delta=-1 de forma atómica.
- Retornar estado final del consumo.

### get_ai_credit_balance(...)
Responsabilidades:
- Retornar saldo acumulado.
- Retornar consumo de anuncios del día.
- Retornar límite restante del día.

## Reglas de negocio
- Límite diario configurable (inicial: 5).
- 1 anuncio válido = 1 crédito.
- 1 operación de IA = 1 crédito (v1).
- Créditos por anuncios no expiran en v1.
- Si falla la IA después del consumo:
  - v1: sin reembolso automático.
  - v2: evaluar reembolso en errores recuperables.

## UX sugerida
Estados clave:
- Con créditos: "Tienes X créditos de IA".
- Sin créditos: "No tienes créditos de IA. Mira un anuncio para continuar".
- Límite alcanzado: "Ya alcanzaste el máximo diario de anuncios. Vuelve mañana".

Pantallas candidatas:
- Vista de créditos de IA en ajustes o recompensas.
- Botón contextual para ver anuncio cuando no haya saldo.

Eventos de analítica sugeridos:
- ad_reward_view_requested
- ad_reward_completed
- ad_reward_claim_failed
- ai_credit_consumed
- ai_credit_consumption_denied

## Integración técnica de anuncios (Android)
Librería objetivo:
- https://docs.page/invertase/react-native-google-mobile-ads

Notas relevantes:
- Requiere build nativo (Dev Client/EAS), no Expo Go.
- Configurar ad unit IDs separados para pruebas y producción.
- Manejar estados de carga, error y no-fill.
- Implementar backoff cuando falle la carga de anuncios.

## Seguridad y anti-fraude
Nivel mínimo (MVP):
- Validación de límite en backend.
- Idempotencia por evento de recompensa.

Nivel recomendado:
- Server Side Verification (SSV) de AdMob.
- Confirmación backend antes de otorgar crédito definitivo.
- Flags para detectar patrones atípicos por usuaria/dispositivo.

## Métricas de éxito
- Créditos ganados por usuaria por día.
- % de usuarias activas que usan anuncios.
- Tasa de completado de rewarded ads.
- Fill rate de anuncios.
- Costo IA por usuaria activa en plan gratuito.
- Ratio de errores en reclamo/consumo.

## Riesgos y mitigaciones
Riesgo: bypass o manipulación desde cliente.
Mitigación: lógica de saldo y límites solo en backend.

Riesgo: frustración por límite diario.
Mitigación: comunicación clara del límite y del reinicio diario.

Riesgo: caídas de red al reclamar recompensa.
Mitigación: idempotencia y reintentos seguros.

Riesgo: no-fill frecuente en inventario de anuncios.
Mitigación: prefetch de ads y fallback UX sin bloqueo abrupto.

## Plan por fases
### Fase 1: MVP
- Crear tablas y RPC de créditos por anuncios.
- Integrar rewarded ad en Android.
- Habilitar consumo de crédito en un flujo piloto de IA.

### Fase 2: Escalado
- Extender consumo de créditos a todos los flujos de IA.
- Mejorar UX de estados y errores.
- Instrumentar analítica y tablero operativo.

### Fase 3: Robustez
- Implementar SSV.
- Añadir reglas de detección de abuso.
- Ajustar economía de créditos según datos reales.

## Decisiones pendientes
- Definir si day_key usa UTC o zona local.
- Definir política de reembolso por error de IA.
- Definir si habrá costo variable por tipo de función de IA.
- Definir ubicación final del módulo de créditos en navegación.

## Criterios de aceptación
- Una usuaria autenticada puede ganar hasta 5 créditos/día por anuncios válidos.
- El límite no se puede superar por reintentos ni duplicados.
- Sin saldo, la IA no se ejecuta.
- Con saldo, se descuenta solo una vez por solicitud válida.
- Todo copy de UI está en español.
