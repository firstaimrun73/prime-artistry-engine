-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Extend ticket_category enum
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'technical';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'feature_request';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'bug_report';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'other';

-- Extend ticket_status enum
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'waiting_user';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'closed';