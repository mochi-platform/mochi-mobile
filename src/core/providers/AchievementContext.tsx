import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AchievementToast } from "@/src/shared/components/AchievementToast";

type AchievementToastData = {
  title: string;
  description: string;
  points: number;
  icon?: string;
};

type AchievementContextValue = {
  showAchievement: (data: AchievementToastData) => void;
};

const AchievementContext = createContext<AchievementContextValue>({
  showAchievement: () => {},
});

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<AchievementToastData | null>(null);
  // Cola para no perder logros si se desbloquean varios seguidos
  const [queue, setQueue] = useState<AchievementToastData[]>([]);

  const showAchievement = useCallback((data: AchievementToastData) => {
    setCurrent((prev) => {
      if (prev === null) {
        // No hay nada mostrándose, mostrar directo
        return data;
      }
      // Ya hay uno visible, encolar
      setQueue((q) => [...q, data]);
      return prev;
    });
  }, []);

  const handleHide = useCallback(() => {
    setCurrent(null);
    // Si hay cola, mostrar el siguiente tras un pequeño delay
    setQueue((q) => {
      if (q.length === 0) return q;
      const [next, ...rest] = q;
      // Pequeño timeout para que el toast anterior termine de salir
      setTimeout(() => setCurrent(next ?? null), 200);
      return rest;
    });
  }, []);

  return (
    <AchievementContext.Provider value={{ showAchievement }}>
      {children}
      {current && (
        <AchievementToast
          key={current.title + Date.now()}
          title={current.title}
          description={current.description}
          points={current.points}
          icon={current.icon}
          onHide={handleHide}
        />
      )}
    </AchievementContext.Provider>
  );
}

export function useAchievement() {
  return useContext(AchievementContext);
}
