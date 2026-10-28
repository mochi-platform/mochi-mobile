-- El recordatorio por hábito vive en el servidor (antes solo en AsyncStorage y se perdía al reinstalar).
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;
