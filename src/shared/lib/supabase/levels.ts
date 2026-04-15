export type MochiLevel = {
  level: number
  name: string
  minPoints: number
  maxPoints: number
  color: string
}

export const MOCHI_LEVELS: MochiLevel[] = [
  { level: 1, name: 'Semilla', minPoints: 0, maxPoints: 99, color: 'green' },
  { level: 2, name: 'Brote', minPoints: 100, maxPoints: 299, color: 'teal' },
  { level: 3, name: 'Estudiante', minPoints: 300, maxPoints: 699, color: 'blue' },
  { level: 4, name: 'Dedicada', minPoints: 700, maxPoints: 1499, color: 'purple' },
  { level: 5, name: 'Constante', minPoints: 1500, maxPoints: 2999, color: 'pink' },
  { level: 6, name: 'Imparable', minPoints: 3000, maxPoints: 5999, color: 'yellow' },
  { level: 7, name: 'Leyenda Mochi', minPoints: 6000, maxPoints: Number.POSITIVE_INFINITY, color: 'orange' },
]

export function getMochiLevel(totalPoints: number): MochiLevel {
  const levels = [...MOCHI_LEVELS].reverse()
  return levels.find((level) => totalPoints >= level.minPoints) ?? MOCHI_LEVELS[0]
}

export function getLevelProgress(totalPoints: number): number {
  const level = getMochiLevel(totalPoints)
  if (!Number.isFinite(level.maxPoints)) {
    return 100
  }

  const range = level.maxPoints - level.minPoints
  if (range <= 0) {
    return 100
  }

  const progress = totalPoints - level.minPoints
  return Math.max(0, Math.min(100, Math.round((progress / range) * 100)))
}
