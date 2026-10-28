export type MochiSummaryWidgetProps = {
  points: number;
  streak: number;
  nextBlock: string;
  updatedAtLabel: string;
  /** Frase del día de Mochi (src/features/companion/lines.ts). */
  line: string;
};
