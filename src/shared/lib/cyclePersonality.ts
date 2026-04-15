import { Ionicons } from "@expo/vector-icons";
import type { CyclePhase } from "@/src/shared/lib/healthConnect";

export interface MochiCyclePersonality {
  phase: CyclePhase;
  emoji: string;
  phaseLabel: string;
  phaseBadgeClass: string;
  phaseIconName: keyof typeof Ionicons.glyphMap;
  phaseColor: string;
  morningMessage: string;
  motivationMessages: string[];
  studyTip: string;
  exerciseTip: string;
  cookingTip: string;
  habitTip: string;
  moodNote: string;
  generalNote: string;
  recommendedEnergyLevel: "baja" | "media" | "alta";
  mochiMood: "happy" | "thinking" | "sleepy" | "excited";
}

const cyclePersonalityMap: Record<CyclePhase, MochiCyclePersonality> = {
  menstrual: {
    phase: "menstrual",
    emoji: "water",
    phaseLabel: "Fase menstrual",
    phaseBadgeClass: "border-rose-200 bg-rose-100",
    phaseIconName: "water-outline",
    phaseColor: "#fb7185",
    morningMessage: "Hoy te acompaño con calma. Descansar también cuenta.",
    motivationMessages: [
      "Tu cuerpo está haciendo un trabajo enorme. Avanza suave y con cariño.",
      "Hoy puedes ir más lento y seguir siendo increíble.",
      "Cada pequeño paso suma, incluso los días de baja energía.",
    ],
    studyTip:
      "Prioriza bloques cortos y repaso suave. Hoy no necesitas forzarte con temas complejos.",
    exerciseTip:
      "Elige yoga, movilidad o caminata tranquila. Tu cuerpo agradecerá un ritmo gentil.",
    cookingTip:
      "Te vienen bien recetas con hierro y efecto antiinflamatorio. Un poco de chocolate negro también está bien.",
    habitTip:
      "Si no completas todo hoy, está bien. Celebramos lo que sí lograste.",
    moodNote:
      "Es normal sentirte más sensible durante esta fase. Estoy contigo.",
    generalNote: "Descansa sin culpa. Tu bienestar es parte de tu progreso.",
    recommendedEnergyLevel: "baja",
    mochiMood: "sleepy",
  },
  folicular: {
    phase: "folicular",
    emoji: "leaf",
    phaseLabel: "Fase folicular",
    phaseBadgeClass: "border-emerald-200 bg-emerald-100",
    phaseIconName: "leaf-outline",
    phaseColor: "#34d399",
    morningMessage:
      "Tu energía está subiendo. Es un gran momento para empezar algo nuevo.",
    motivationMessages: [
      "Tu mente está lista para aprender y crear.",
      "Hoy es ideal para abrir proyectos nuevos con confianza.",
      "Aprovecha este impulso: foco, curiosidad y acción.",
    ],
    studyTip:
      "Excelente fase para estudiar temas nuevos, memorizar y empujar proyectos grandes.",
    exerciseTip:
      "Prueba fuerza o cardio más intenso. Tu cuerpo suele responder muy bien ahora.",
    cookingTip:
      "Anímate a recetas nuevas y creativas. Tu lado explorador está encendido.",
    habitTip: "Buena etapa para construir hábitos nuevos y consolidar rutinas.",
    moodNote:
      "Tu motivación puede sentirse más estable en esta fase. Úsala a tu favor.",
    generalNote: "Estás en fase de expansión: empieza, experimenta y avanza.",
    recommendedEnergyLevel: "alta",
    mochiMood: "happy",
  },
  ovulatoria: {
    phase: "ovulatoria",
    emoji: "sun",
    phaseLabel: "Fase ovulatoria",
    phaseBadgeClass: "border-amber-200 bg-amber-100",
    phaseIconName: "sunny-outline",
    phaseColor: "#f59e0b",
    morningMessage: "Tu confianza está en alto. Hoy puedes brillar con fuerza.",
    motivationMessages: [
      "Estás en un momento de mucha energía y presencia.",
      "Aprovecha para tus tareas más retadoras. Tú puedes con eso y más.",
      "Hoy se siente como un gran día para mostrar lo que sabes.",
    ],
    studyTip:
      "Muy buena fase para exposiciones, exámenes y actividades en equipo.",
    exerciseTip:
      "Si te sientes bien, esta es tu ventana para retos intensos y entrenos potentes.",
    cookingTip:
      "Prueba recetas coloridas y para compartir. Tu energía social acompaña.",
    habitTip:
      "Completar tus hábitos suele fluir más fácil ahora. Capitaliza este impulso.",
    moodNote:
      "Puedes sentir más seguridad y claridad. Úsala para tareas clave.",
    generalNote: "Estás en tu mejor momento para empujar objetivos grandes.",
    recommendedEnergyLevel: "alta",
    mochiMood: "excited",
  },
  lutea: {
    phase: "lutea",
    emoji: "moon",
    phaseLabel: "Fase lútea",
    phaseBadgeClass: "border-violet-200 bg-violet-100",
    phaseIconName: "moon-outline",
    phaseColor: "#8b5cf6",
    morningMessage: "Vamos con enfoque amable. Hoy priorizamos lo esencial.",
    motivationMessages: [
      "Tu constancia vale más que la perfección.",
      "Organizar y cerrar pendientes hoy puede rendirte muchísimo.",
      "No necesitas exigirte de más para avanzar.",
    ],
    studyTip:
      "Ideal para tareas de detalle, revisión, organización y cierres pendientes.",
    exerciseTip:
      "Puedes priorizar pilates, natación o intensidad baja-media según cómo te sientas.",
    cookingTip:
      "Recetas reconfortantes y carbohidratos complejos pueden ayudarte a sentirte mejor.",
    habitTip:
      "Quédate con lo esencial. Cumplir lo básico también es una victoria.",
    moodNote:
      "Es común notar más sensibilidad emocional en esta fase. Respira, aquí estoy contigo.",
    generalNote: "Baja la autoexigencia y sostén hábitos clave con suavidad.",
    recommendedEnergyLevel: "media",
    mochiMood: "thinking",
  },
  unknown: {
    phase: "unknown",
    emoji: "sparkles",
    phaseLabel: "Fase no disponible",
    phaseBadgeClass: "border-slate-200 bg-slate-100",
    phaseIconName: "sparkles-outline",
    phaseColor: "#94a3b8",
    morningMessage: "Estoy contigo para construir un día bonito, paso a paso.",
    motivationMessages: [
      "Tu progreso vale, incluso cuando no todo sale perfecto.",
      "Hoy cuenta cada acción pequeña que elijas sostener.",
    ],
    studyTip: "Elige un objetivo claro y avanza en bloques manejables.",
    exerciseTip:
      "Muévete según tu energía disponible. Lo importante es la constancia.",
    cookingTip: "Prioriza recetas simples, nutritivas y que disfrutes.",
    habitTip: "Sostén 1 o 2 hábitos base para mantener ritmo.",
    moodNote: "Escúchate con cariño. Tu bienestar es prioridad.",
    generalNote: "Avanza con amabilidad: equilibrio antes que perfección.",
    recommendedEnergyLevel: "media",
    mochiMood: "happy",
  },
};

export function getCyclePersonality(phase: CyclePhase): MochiCyclePersonality {
  return cyclePersonalityMap[phase] ?? cyclePersonalityMap.unknown;
}

export default getCyclePersonality;
