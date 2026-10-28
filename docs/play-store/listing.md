# Ficha de Google Play — Mochi

> Textos listos para pegar en Play Console. Revisa que cada afirmación siga siendo cierta antes de publicar.

## Datos básicos
- **Nombre (30 máx.):** Mochi: estudio y bienestar
- **Categoría:** Productividad (alternativa: Salud y bienestar)
- **Clasificación:** 16+ (la app verifica edad 16+ al registrarse)
- **Contacto / política:** correo de soporte y `https://<dominio>/privacy`; eliminación de cuenta: `https://<dominio>/delete-account`

## Descripción corta (80 máx.)
Tu compañera de estudio: horarios, hábitos, recetas y bienestar, a tu ritmo.

## Descripción completa
Mochi es una app para organizar tu día sin agobiarte. Estudia con un temporizador y tu horario, cuida tus hábitos, cocina con recetas paso a paso y lleva un seguimiento amable de cómo te sientes.

**Estudio**
- Horario de bloques, temporizador, historial y recordatorios.
- Exámenes con sprints de repaso y registro de notas.
- Flashcards con repaso espaciado (SM-2) y generación desde una foto de tus apuntes.

**Bienestar**
- Hábitos, ánimo, energía y rutinas de ejercicio.
- Seguimiento del ciclo opcional: el registro manual se queda **solo en tu teléfono**; con Health Connect, Mochi solo lee lo que tú autorices. Los datos de ciclo y salud nunca se envían a la IA.

**Cocina**
- Recetas con modo paso a paso y pantalla siempre encendida.
- Catálogo de recetas compartidas por la comunidad, con opción de reportar contenido.

**Mochi Duo**
- Comparte vales y detalles con tu pareja, con privacidad por diseño y avisos con horas de silencio.

**Mochi Premium**
- Temas, más ayuda de IA y estadísticas más profundas. Sin anuncios para Premium.

Tu privacidad primero: consentimientos separados y revocables para la IA, la analítica y la memoria de Mochi; puedes exportar o eliminar tus datos desde Ajustes.

## Seguridad de los datos (Data safety) — respuestas orientativas
| Tipo | ¿Se recopila? | Fin | Notas |
|---|---|---|---|
| Correo / ID de usuario | Sí | Cuenta, funcionalidad | Supabase Auth |
| Salud y fitness (ciclo, ánimo) | Sí, opcional | Funcionalidad | El ciclo manual no sale del dispositivo; Health Connect solo lectura bajo permiso |
| Fotos | Sí, opcional | Funcionalidad | Imágenes de vales y apuntes para flashcards |
| Contenido generado (notas, recetas) | Sí | Funcionalidad | |
| Diagnósticos y fallos | Sí | Análisis | Sentry (sin datos personales de salud) |
| Actividad en la app | Si hay consentimiento `analytics` | Análisis | PostHog; sin salud ni texto libre |
| Identificadores de dispositivo / anuncios | Sí (usuarias free) | Publicidad | AdMob con consentimiento UMP; menores sin personalización |
- **Cifrado en tránsito:** sí. **Eliminación de datos:** sí (en la app y en la web).
- **Salud / Health Connect:** declarar el uso (formulario de permisos de salud) con la justificación de lectura de ciclo; incluir `READ_HEALTH_DATA_HISTORY` solo si se mantiene la ventana de 24 meses.

## Gráficos
- Icono 512×512 y gráfico de funciones 1024×500 (arte de Mochi en `assets/`).
- Capturas de teléfono (mín. 2, recomendado 6–8), vertical, tema claro y oscuro:
  1. Inicio · 2. Estudio/temporizador · 3. Flashcards · 4. Bienestar · 5. Cocina paso a paso · 6. Duo/vales · 7. Temas Premium · 8. Modo oscuro
- **Cómo tomarlas:** con la cuenta demo (ver abajo), emulador Pixel 8 a 1080×2400, `adb exec-out screencap -p > captura.png`. Sin datos reales ni correos visibles.

## Cuenta demo y revisión
- La cuenta demo ya se llama "Mochi Demo" (sin privilegios). Antes de entregarla a Google, regenera su contraseña desde el panel de Auth.
- Ver `docs/play-store/review-notes.md` para las instrucciones de revisión.

## Plan de prueba cerrada (cuentas personales nuevas)
1. Crear el track de prueba cerrada y subir el AAB firmado (EAS Build, perfil `production`).
2. Reclutar **12 o más** testers y mantener la prueba **14 días seguidos** (requisito para cuentas personales nuevas).
3. Recoger feedback con un formulario corto; corregir lo bloqueante; subir builds sucesivos al mismo track.
4. Pedir acceso a producción desde Play Console al cumplir los 14 días.
5. Antes: completar contenido de la app (política, Data safety, clasificación, anuncios, salud) y verificación de identidad.
