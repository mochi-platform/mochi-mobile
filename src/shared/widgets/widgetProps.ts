export type MochiSummaryWidgetProps = {
  points: number;
  streak: number;
  nextBlock: string;
  updatedAtLabel: string;
  /** Frase del día de Mochi (src/features/companion/lines.ts). */
  line: string;
  /** «Me llegó hoy» solo si la usuaria ya registra su ciclo. */
  showPeriod?: boolean;
};

export type MochiStreakWidgetProps = {
  streak: number;
  habitsDone: number;
  habitsTotal: number;
};

export type MochiDuoWidgetProps = {
  /** Sin espacio Duo aceptado, el widget invita a abrir Duo. */
  hasPartner: boolean;
  partnerName: string;
  /** Última nota que mandó la pareja ("" si no hay). */
  note: string;
  /** Ánimo compartido 1–5, 0 si no hay. */
  mood: number;
};
