-- Hotfix: Add missing columns to kalina_agents table
-- These columns are required by the frontend but were missing from the base schema

-- Add voice_name column (used in useAgentCreation.ts insert)
ALTER TABLE public.kalina_agents
  ADD COLUMN IF NOT EXISTS voice_name TEXT;

-- Add is_active column (used in useAgentCreation.ts insert)
ALTER TABLE public.kalina_agents
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure the id column has a proper default (gen_random_uuid())
-- The existing TEXT id with gen_random_uuid() default should be fine,
-- but let's make sure the constraint is consistent
-- (no-op if already correct)

-- Hotfix: Ensure chat_widget_configs has proper INSERT policy for authenticated users
-- This fixes the "Chat Widget tab does not open" issue

-- First check if RLS is enabled on chat_widget_configs
ALTER TABLE IF EXISTS public.chat_widget_configs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate INSERT policy to be safe
DROP POLICY IF EXISTS "Users can create their own widget configs" ON public.chat_widget_configs;
CREATE POLICY "Users can create their own widget configs"
  ON public.chat_widget_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view their own widget configs" ON public.chat_widget_configs;
CREATE POLICY "Users can view their own widget configs"
  ON public.chat_widget_configs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Users can update their own widget configs" ON public.chat_widget_configs;
CREATE POLICY "Users can update their own widget configs"
  ON public.chat_widget_configs
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Grant necessary table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_widget_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kalina_agents TO authenticated;
