# Respuesta a incidentes de datos personales

Marco: LOPDP (Ecuador). Plazo de notificación a la Superintendencia de Protección de Datos Personales: **5 días** desde que se tiene conocimiento de la brecha.

## 1. Detectar y contener (primeras horas)
- Fuentes: alertas de Sentry, advisors de Supabase (`get_advisors`), reportes de usuarias, logs de Edge Functions.
- Contener: rotar claves afectadas (service role, OpenRouter, RevenueCat, AdMob), revocar sesiones, desplegar la corrección.
- Preservar evidencia: logs, consultas, marcas de tiempo. No borrar nada hasta evaluar.

## 2. Evaluar
- ¿Qué datos? (¿ciclo u otros datos de salud? ¿credenciales? ¿contactos?)
- ¿A cuántas personas y desde cuándo?
- ¿Riesgo para sus derechos? Un dato de salud expuesto se considera de riesgo alto.

## 3. Notificar
- Superintendencia de Protección de Datos Personales: dentro de 5 días, con naturaleza de la brecha, datos y personas afectadas, medidas tomadas y contacto.
- Personas afectadas: sin demora si el riesgo es alto, en español claro, con qué pasó, qué datos y qué pueden hacer.
- Google Play: si afecta a la app, seguir la política de incidentes de Play.

## 4. Cerrar
- Causa raíz, corrección, prueba de regresión (pgTAP) y actualización de este documento.
- Registrar el incidente: fecha, alcance, decisiones y notificaciones.

Contacto interno: privacidad@siramong.tech
