# Suscripciones premium para IA

## Resumen
Implementar una suscripción premium para reducir fricción de uso de IA, habilitar mayores límites de consumo y crear una vía de monetización sostenible.

Contexto confirmado:
- Plataforma objetivo en esta etapa: Android.
- Proveedor de suscripciones: RevenueCat (sobre Google Play Billing).
- Proveedor de IA del producto: OpenRouter.

Objetivo:
- Financiar costos de IA de forma predecible.
- Ofrecer valor real a usuarias intensivas.
- Mantener convivencia con plan gratuito basado en anuncios.

Alcance de este documento:
- Solo suscripciones premium y gestión de entitlement.
- El sistema de anuncios y créditos por anuncios vive en documento separado.

## Propuesta de planes
## Planes en evaluación
- Prueba gratuita de 30 días.
- Semanal: 2,99 USD.
- Mensual: 4.99 USD.
- Anual: 13.99 USD.
- Lifetime: 25 USD.

Lectura rápida:
- Equivalente anual mensualizado: 1.17 USD/mes.
- Descuento frente a mensual: aproximadamente 76.6%.

Interpretación:
- Empuja con fuerza el plan anual.
- Es agresivo en margen; requiere guardrails de uso para evitar pérdida por alto consumo de IA.

## Beneficios premium sugeridos
Beneficios base:
- Bolsa de créditos/tokens mensual superior al plan gratuito.
- Menor dependencia de anuncios para desbloquear IA.
- Prioridad de respuesta o límites de uso diarios más amplios.

Beneficios futuros opcionales:
- Características avanzadas de estudio/cocina con IA.
- Mayor contexto o historial extendido en experiencias conversacionales.
- Mejoras en personalización por perfil.

## Arquitectura recomendada
### 1) Fuente de verdad
El estado premium efectivo debe decidirse en backend (Supabase), no solo en cliente.

Principio:
- RevenueCat informa eventos de compra/renovación/cancelación.
- Backend persiste estado de suscripción y aplica reglas de plan.
- Cliente consulta plan activo y muestra UX acorde.

### 2) Flujo de compra
1. Usuaria abre paywall en app Android.
2. Cliente inicia compra con RevenueCat.
3. RevenueCat/Google Play confirman transacción.
4. Backend sincroniza entitlement premium.
5. App refresca estado y activa beneficios premium.

### 3) Flujo de renovación, cancelación y expiración
1. Webhook/evento notifica cambio de estado.
2. Backend actualiza suscripción y fechas de vigencia.
3. Al expirar, la usuaria vuelve a reglas free sin intervención manual.

### 4) Flujo de restauración
1. Usuaria pulsa restaurar compras.
2. RevenueCat resuelve entitlement vigente.
3. Backend sincroniza y normaliza estado.

## Modelo de datos (Supabase)
### Tabla: billing_subscriptions
Estado actual y trazabilidad resumida por usuaria.

Campos sugeridos:
- id (uuid, pk)
- user_id (uuid, fk -> auth.users)
- provider (text, revenuecat)
- entitlement_id (text, premium)
- product_id (text, mensual/anual)
- status (text: active, grace_period, paused, cancelled, expired)
- current_period_started_at (timestamptz)
- current_period_ends_at (timestamptz)
- auto_renew (boolean)
- store (text, google_play)
- external_customer_id (text)
- raw_payload (jsonb)
- updated_at (timestamptz)

Índices sugeridos:
- unique(user_id, entitlement_id)
- índice por status
- índice por current_period_ends_at

### Tabla: billing_events
Bitácora inmutable de eventos de facturación para auditoría.

Campos sugeridos:
- id (uuid, pk)
- user_id (uuid nullable)
- provider (text)
- event_type (text)
- event_id (text único por proveedor)
- payload (jsonb)
- received_at (timestamptz)

Índices y restricciones:
- unique(provider, event_id)
- índice por user_id y received_at

### Tabla: ai_usage_limits
Configuración de límites por plan.

Campos sugeridos:
- id (uuid, pk)
- plan_key (text: free, premium)
- monthly_token_budget (int)
- daily_request_limit (int)
- features (jsonb)
- updated_at (timestamptz)

## RPC/Funciones recomendadas
### sync_subscription_from_revenuecat(...)
Responsabilidades:
- Validar autenticidad/origen del evento.
- Registrar evento en billing_events con idempotencia.
- Actualizar billing_subscriptions.
- Retornar plan efectivo.

### get_user_plan(...)
Responsabilidades:
- Determinar plan actual de la usuaria.
- Exponer límites efectivos (requests/tokens/features).
- Servir como fuente para gating en frontend.

### apply_plan_limits_for_ai(...)
Responsabilidades:
- Centralizar chequeo de límites antes de cada llamada de IA.
- Aplicar reglas premium o free según plan vigente.
- Registrar consumo y rechazos por límite.

## Reglas de negocio
- Premium activo desbloquea límites premium definidos en ai_usage_limits.
- Si premium expira, el plan vuelve a free automáticamente.
- Siempre aplicar política de uso justo para evitar abuso.
- Cambios de límites se realizan en configuración, no en código cliente.

Política de gracia sugerida:
- Soportar grace_period cuando la tienda lo indique.
- Mantener beneficios durante gracia si el estado sigue siendo válido.

## UX sugerida
Estados clave:
- Plan free: mostrar beneficios premium bloqueados y CTA claro.
- Plan premium activo: mostrar estado, próxima renovación y beneficios activos.
- Plan cancelado con acceso vigente: comunicar fecha de fin sin alarmismo.
- Plan expirado: mostrar opción de reactivación.

Pantallas candidatas:
- Paywall premium.
- Pantalla de estado de suscripción.
- Sección de beneficios premium dentro de ajustes.

Copy recomendado:
- Cálido, directo y en español.
- Evitar promesas ambiguas de "ilimitado" si hay fair use.

## Integración con RevenueCat (Android)
Configuración base:
- Proyecto y app Android en RevenueCat.
- Productos en Google Play Console (mensual y anual).
- Entitlement premium asociado a ambos productos.

Eventos mínimos a registrar:
- purchase_started
- purchase_completed
- purchase_restored
- renewal_completed
- entitlement_activated
- entitlement_expired
- entitlement_cancelled

## Seguridad y cumplimiento
- No confiar solo en estado local del SDK para autorización crítica.
- Validar eventos con idempotencia estricta.
- Restringir endpoint de webhook por firma/origen.
- Evitar exponer lógica de privilegios premium en cliente como única barrera.

## Métricas de éxito
- Conversión a premium.
- Distribución mensual vs anual.
- Churn mensual y anual.
- ARPPU (ingreso promedio por usuaria de pago).
- Costo de IA por usuaria premium.
- Margen neto por plan después de comisiones.

## Riesgos y mitigaciones
Riesgo: pricing anual demasiado bajo para consumo real.
Mitigación: límites premium claros, fair use y revisión trimestral de precios.

Riesgo: desalineación entre estado de tienda y estado local.
Mitigación: backend como fuente de verdad y sincronización periódica.

Riesgo: confusión entre beneficios free y premium.
Mitigación: matriz de beneficios clara y visible en paywall.

Riesgo: soporte por compras no restauradas.
Mitigación: flujo robusto de restauración y mensajes claros de diagnóstico.

## Plan por fases
### Fase 1: Fundaciones
- Configurar productos en Google Play + RevenueCat.
- Definir entitlement premium.
- Implementar tablas y sincronización inicial en backend.

### Fase 2: Activación
- Implementar paywall y restauración en Android.
- Consumir estado premium desde backend.
- Activar límites premium en operaciones de IA.

### Fase 3: Optimización
- A/B tests de pricing y copy del paywall.
- Ajuste de límites premium según unit economics.
- Tablero de métricas de conversión y margen.

### Fase 4: Escalado
- Automatizar alertas de churn y fallos de renovación.
- Mejorar segmentación de ofertas.
- Preparar base técnica para futura expansión a iOS.

## Decisiones pendientes
- Confirmar precio final de lanzamiento mensual/anual.
- Definir límites premium exactos por feature de IA.
- Definir política explícita de fair use en términos del producto.
- Definir si habrá prueba gratuita o no.

## Criterios de aceptación
- La compra mensual/anual activa entitlement premium correctamente.
- Restaurar compra reactiva premium sin intervención manual del equipo.
- Al expirar premium, se aplica plan free automáticamente.
- Las reglas de acceso premium se evalúan desde backend.
- Todo copy de UI está en español y sin ambigüedad sobre límites.
