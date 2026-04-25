
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;

CREATE POLICY "Users view own media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deepguard-media' AND auth.uid()::text = (storage.foldername(name))[1]);
