ALTER TABLE public.workouts ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.workouts ADD COLUMN day_of_week text;