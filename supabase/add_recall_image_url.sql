-- Optional: run after init if your project was created before image_url existed.
ALTER TABLE public.recall ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.recall.image_url IS 'Optional product/recall image URL (HTTPS) for display in the app.';
