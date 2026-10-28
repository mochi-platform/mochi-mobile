export type Deck = { id: string; subject: string; topic: string; created_at: string | null };

export type Card = {
  id: string;
  deck_id: string | null;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
};

export const CARD_COLUMNS =
  "id, deck_id, front, back, ease_factor, interval_days, repetitions, due_at";
