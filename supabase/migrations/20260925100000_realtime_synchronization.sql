-- =============================================================================
-- MENIAL — REALTIME SYNCHRONIZATION PUBLICATION & REPLICA IDENTITIES
-- =============================================================================
-- Migration: 20260925100000_realtime_synchronization.sql
-- Purpose:   Enables Postgres Realtime CDC streaming for live job lifecycle
--            transitions (§31-§33), Section 48 job-scoped messaging with
--            instant receipt, Section 49 Emergency SOS alerts, and notifications.
-- Reference: menial-master-spec-v2.md (§31, §32, §48, §49, §50, §51)
-- =============================================================================

-- 1. Ensure supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Configure REPLICA IDENTITY FULL on subscribed tables
-- Ensures UPDATE and DELETE payloads contain complete previous and current row data
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.job_workers REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.safety_reports REPLICA IDENTITY FULL;

-- 3. Add tables to supabase_realtime publication idempotently
DO $$
BEGIN
  -- jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;

  -- job_workers
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_workers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_workers;
  END IF;

  -- messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  -- conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- safety_reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'safety_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_reports;
  END IF;
END $$;

COMMENT ON PUBLICATION supabase_realtime IS 
  'Enables real-time websocket synchronization for jobs, workers, messages, and safety reports. §48, §49, §51';
