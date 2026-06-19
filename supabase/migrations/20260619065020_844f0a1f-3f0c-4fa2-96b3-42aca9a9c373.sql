CREATE POLICY "ticket attachments select own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND owner = auth.uid());

CREATE POLICY "ticket attachments insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND owner = auth.uid());

CREATE POLICY "ticket attachments delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND owner = auth.uid());