CREATE POLICY "Users manage own ticket attachments - select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users manage own ticket attachments - insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users manage own ticket attachments - delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);