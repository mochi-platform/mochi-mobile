import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { Mood } from "@/src/features/companion/lines";

const FILL: Record<Mood, string> = {
  1: "#D9CCE9",
  2: "#E7D9EC",
  3: "#F6E7D8",
  4: "#FAD9DD",
  5: "#F7C6D3",
};
const MOUTH: Record<Mood, string> = {
  1: "M11 21 Q15 17 19 21",
  2: "M11 20 H19",
  3: "M11 19 Q15 21 19 19",
  4: "M10.5 18.5 Q15 23 19.5 18.5",
  5: "M10 18 Q15 25 20 18 Z",
};
const INK = "#5A2F2F";

/** Carita de ánimo del 1 (muy mal) al 5 (muy bien), con el estilo de Mochi. */
export function MoodFace({ mood, size = 32 }: { mood: Mood; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={13} fill={FILL[mood]} />
      <G stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round">
        {mood === 5 ? (
          <Path d="M8.5 13.5 q2 -3 4 0 M17.5 13.5 q2 -3 4 0" />
        ) : mood === 1 ? (
          <Path d="M8.5 14.5 q2 1.6 4 0 M17.5 14.5 q2 1.6 4 0" />
        ) : (
          <>
            <Circle cx={10.5} cy={14} r={1.6} fill={INK} stroke="none" />
            <Circle cx={19.5} cy={14} r={1.6} fill={INK} stroke="none" />
          </>
        )}
        <Path d={MOUTH[mood]} fill={mood === 5 ? INK : "none"} />
      </G>
      {mood >= 4 ? (
        <>
          <Ellipse cx={7.5} cy={18} rx={2.2} ry={1.2} fill="#F26D8F" opacity={0.5} />
          <Ellipse cx={22.5} cy={18} rx={2.2} ry={1.2} fill="#F26D8F" opacity={0.5} />
        </>
      ) : null}
    </Svg>
  );
}
