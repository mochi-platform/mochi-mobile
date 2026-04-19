### 🟢 Alta prioridad / bajo esfuerzo

**Tour guiado previo a selección de módulos (Onboarding)** — integrar `react-native-lumen` para mostrar una guía corta de cada módulo (Estudio, Ejercicio, Hábitos, Cocina, Metas, Estado de ánimo, Gratitud) antes de que la usuaria elija cuáles activar. Objetivo: que descubra el valor de cada módulo antes de decidir y evitar tener que reintroducir tutoriales luego.

**Widget de resumen en pantalla de inicio (Android)** — expo-widgets o similar. Mostrar puntos actuales, streak y bloque del día. Alta visibilidad, refuerza el habit loop diario.

**Pantalla de analíticas personales** — gráficos simples con Recharts/Victory Native mostrando: horas de estudio por semana, hábitos completados por mes, evolución de streak. Ya hay datos suficientes en Supabase.

**Modo Pomodoro en el study timer** — alternar entre 25 min foco / 5 min descanso dentro de `study-timer.tsx`. El timer ya existe, solo necesita lógica de ciclos y notificación de cambio de fase.

**Búsqueda y filtros en recetas** — la pantalla de cocina crece rápido. Filtrar por dificultad, tipo, favoritas. El estado ya está en `cooking.tsx`.

### 🟡 Prioridad media

**Compartir logros** — desde `profile.tsx`, generar imagen compartible de un logro desbloqueado (ya hay `react-native-view-shot` instalado, se usa en vouchers y weekly-summary).

**Integración con calendario** — exportar bloques de estudio al calendario del dispositivo vía `expo-calendar`. Especialmente útil para las pantallas de `study-create` y `exam-log`.

**Recordatorios de examen personalizados** — actualmente solo 1 día antes. Permitir recordatorios a 7, 3 y 1 día antes desde `exam-log.tsx`.

**Modo offline parcial** — cachear el dashboard principal con AsyncStorage para que cargue instantáneamente. Los datos de hoy (bloques, rutinas) raramente cambian mid-sesión.

### 🔵 Estratégicas (próximo ciclo)

**Dashboard admin para Doménica** — ya identificado como pendiente. Usar `SECURITY DEFINER` RPCs para stats agregadas. Separar en web dashboard.

**Monetización: Mochi Tokens** — la arquitectura de gamificación ya tiene todo lo necesario (`total_points`, `vouchers`, `achievements`). Agregar tabla `token_transactions` y límite diario de tokens por tier.

**Espacio compartido de pareja** — crear `shared_spaces` con `joint_goals` y `joint_vouchers`. Los vouchers ya tienen la base; la feature de pareja está referenciada en `partner_features_enabled`.

**IA proactiva: Mochi Weekly Planner** — basado en los exámenes próximos, fase del ciclo y hábitos actuales, generar automáticamente sugerencias de bloques de estudio para la semana. Usa los endpoints de IA ya existentes: `generateStudyBlockSuggestions` + `predictWellnessRisk`.
