-- 1. Add INSERT policy on profiles so users can only create their own row
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. Prevent self-escalation of plan/credits via column-level privileges.
-- Remove blanket UPDATE privilege and grant only safe, user-editable columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- 3. Remove the duplicate owner-based ticket-attachment storage policies,
-- keeping the folder-based policies that scope access to the user's own folder.
DROP POLICY IF EXISTS "ticket attachments delete own" ON storage.objects;
DROP POLICY IF EXISTS "ticket attachments insert own" ON storage.objects;
DROP POLICY IF EXISTS "ticket attachments select own" ON storage.objects;