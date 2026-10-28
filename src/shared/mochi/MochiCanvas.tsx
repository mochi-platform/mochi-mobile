import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  vec,
} from "@shopify/react-native-skia";
import { memo, useEffect, useImperativeHandle, useMemo, useRef, type Ref } from "react";
import { Pressable, View } from "react-native";
import { haptic } from "@/src/shared/ui/haptics";
import { buildFace, type Shape } from "./expressions";
import {
  ANCHORS,
  BODY_PATH,
  BODY_SHINE_PATH,
  CAP_CREASE_PATH,
  CAP_PATH,
  MOCHI_COLORS as C,
  MOCHI_VIEWBOX,
  OUTLINE_WIDTH,
  SPRINKLES,
  TOP_CREASE_PATH,
  TOP_PATH,
} from "./geometry";
import type { MochiExpression } from "./manifest";
import { useMochiRig, type MochiReaction } from "./useMochiRig";

export type MochiHandle = {
  react: (kind: MochiReaction) => void;
  /** Mirar hacia un punto relativo (-1 a 1). */
  lookAt: (x: number, y: number) => void;
};

type MochiCanvasProps = {
  expression?: MochiExpression;
  /** Ancho en puntos; el alto se deriva de la proporción del dibujo. */
  size?: number;
  /** Respira y parpadea. Apágalo en tamaños pequeños o listas (una Mochi viva por pantalla). */
  animated?: boolean;
  /** Si se pasa (o `interactive`), al tocarla se aplasta, vibra y llama a onPress. */
  onPress?: () => void;
  interactive?: boolean;
  /** Sombra bajo Mochi; apágala cuando va dentro de una tarjeta pequeña. */
  shadow?: boolean;
  ref?: Ref<MochiHandle>;
  accessibilityLabel?: string;
};

const ORIGIN_BODY = vec(ANCHORS.ground.x, ANCHORS.ground.y);
/** Margen del lienzo (en unidades del dibujo) para saltar y aplastarse sin recortarse.
 * No cambia el espacio que Mochi ocupa en el layout: el lienzo sobresale de su caja. */
const BLEED_X = 12;
const BLEED_TOP = 22;
const ORIGIN_EYES = vec(85, ANCHORS.eyeLine);

const ShapeView = memo(function ShapeView({ shape }: { shape: Shape }) {
  if (shape.type === "circle") {
    return (
      <Circle cx={shape.cx} cy={shape.cy} r={shape.r} color={shape.color} opacity={shape.opacity ?? 1} />
    );
  }
  const body = (
    <>
      {shape.fill ? <Path path={shape.d} color={shape.fill} opacity={shape.opacity ?? 1} /> : null}
      {shape.stroke ? (
        <Path
          path={shape.d}
          color={shape.stroke}
          style="stroke"
          strokeWidth={shape.strokeWidth ?? 2.6}
          strokeCap="round"
          strokeJoin="round"
          opacity={shape.opacity ?? 1}
        />
      ) : null}
    </>
  );
  if (!shape.rotate) return body;
  return (
    <Group
      origin={vec(shape.rotate.cx, shape.rotate.cy)}
      transform={[{ rotate: (shape.rotate.deg * Math.PI) / 180 }]}
    >
      {body}
    </Group>
  );
});

function Shapes({ shapes }: { shapes: Shape[] }) {
  return (
    <>
      {shapes.map((shape, index) => (
        <ShapeView key={index} shape={shape} />
      ))}
    </>
  );
}

/** Mochi vectorial: fiel al arte original, animable y con expresiones ilimitadas. */
export function MochiCanvas({
  expression = "happy",
  size = 120,
  animated = true,
  onPress,
  interactive = false,
  shadow = true,
  ref,
  accessibilityLabel = "Mochi",
}: MochiCanvasProps) {
  const face = useMemo(() => buildFace(expression), [expression]);
  const rig = useMochiRig(animated);
  const scale = size / MOCHI_VIEWBOX.width;
  const height = Math.round(MOCHI_VIEWBOX.height * scale);
  const bleedX = BLEED_X * scale;
  const bleedTop = BLEED_TOP * scale;

  useImperativeHandle(ref, () => ({ react: rig.react, lookAt: rig.lookAt }), [rig.react, rig.lookAt]);

  // Al cambiar de expresión, un pequeño "pop" para que el cambio se sienta intencional.
  const first = useRef(true);
  const { react } = rig;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    react("pop");
  }, [expression, react]);

  const cheekW = 7 * face.blush;
  const cheekH = 3.6 * face.blush;

  const canvas = (
    <Canvas
      style={{
        position: "absolute",
        left: -bleedX,
        top: -bleedTop,
        width: size + bleedX * 2,
        height: height + bleedTop,
      }}
    >
      <Group transform={[{ translateX: bleedX }, { translateY: bleedTop }, { scale }]}>
        {shadow ? (
          <Oval
            x={ANCHORS.shadow.x - ANCHORS.shadow.rx}
            y={ANCHORS.shadow.y - ANCHORS.shadow.ry}
            width={ANCHORS.shadow.rx * 2}
            height={ANCHORS.shadow.ry * 2}
            color={C.outline}
            opacity={0.1}
          />
        ) : null}
        <Group origin={ORIGIN_BODY} transform={rig.bodyTransform}>
          {/* Contorno: trazo grueso detrás de los rellenos, así solo se ve la silueta exterior. */}
          {[BODY_PATH, CAP_PATH, TOP_PATH].map((d) => (
            <Path
              key={d}
              path={d}
              color={C.outline}
              style="stroke"
              strokeWidth={OUTLINE_WIDTH}
              strokeJoin="round"
            />
          ))}
          <Path path={BODY_PATH}>
            <LinearGradient start={vec(0, 102)} end={vec(0, 149)} colors={[C.bodyTop, C.bodyBottom]} />
          </Path>
          <Path
            path={BODY_SHINE_PATH}
            color="#FFFFFF"
            style="stroke"
            strokeWidth={3}
            strokeCap="round"
            opacity={0.5}
          />
          <Path path={CAP_PATH}>
            <LinearGradient start={vec(0, 39)} end={vec(0, 94)} colors={[C.capTop, C.capBottom]} />
          </Path>
          <Path
            path={CAP_CREASE_PATH}
            color={C.capCrease}
            style="stroke"
            strokeWidth={2.4}
            strokeCap="round"
            opacity={0.7}
          />
          <Path path={TOP_PATH}>
            <LinearGradient start={vec(0, 7)} end={vec(0, 60)} colors={[C.topTop, C.topBottom]} />
          </Path>
          <Path
            path={TOP_CREASE_PATH}
            color={C.topCrease}
            style="stroke"
            strokeWidth={2}
            strokeCap="round"
            opacity={0.7}
          />
          {SPRINKLES.map(([cx, cy, r, opacity]) => (
            <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} color="#FFFFFF" opacity={opacity} />
          ))}
          <Circle cx={32} cy={106} r={2} color={C.freckle} />

          {/* Cara */}
          {[ANCHORS.leftCheek, ANCHORS.rightCheek].map((cheek) => (
            <Oval
              key={cheek.x}
              x={cheek.x - cheekW}
              y={cheek.y - cheekH}
              width={cheekW * 2}
              height={cheekH * 2}
              color={C.blush}
              opacity={0.85}
            >
              <BlurMask blur={1.4} style="normal" />
            </Oval>
          ))}
          <Shapes shapes={face.brows} />
          <Group origin={ORIGIN_EYES} transform={face.blinks ? rig.eyesTransform : undefined}>
            <Shapes shapes={face.eyes} />
            <Group transform={face.blinks ? rig.pupilsTransform : undefined}>
              <Shapes shapes={face.pupils} />
            </Group>
          </Group>
          <Shapes shapes={face.mouth} />
        </Group>
        <Shapes shapes={face.extra} />
      </Group>
    </Canvas>
  );

  const box = { width: size, height, overflow: "visible" as const };
  if (!onPress && !interactive) {
    return (
      <View
        style={box}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {canvas}
      </View>
    );
  }
  return (
    <Pressable
      style={box}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic("light");
        rig.react("tap");
        onPress?.();
      }}
    >
      {canvas}
    </Pressable>
  );
}
