DELETE FROM public.trade_history;
DELETE FROM public.learning_notes
WHERE content IN (
  SELECT content FROM public.learning_notes GROUP BY content HAVING count(*) > 3
);