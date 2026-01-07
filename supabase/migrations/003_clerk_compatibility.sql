-- Migration: Add Clerk compatibility to profiles table
-- This migration modifies the profiles table to work with Clerk authentication
-- instead of Supabase Auth

-- Step 1: Add clerk_id column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clerk_id TEXT;

-- Step 2: Create index on clerk_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON profiles(clerk_id);

-- Step 3: Make clerk_id unique (one Clerk user per profile)
ALTER TABLE profiles ADD CONSTRAINT profiles_clerk_id_unique UNIQUE (clerk_id);

-- Step 4: Update the id column to be a regular UUID (not referencing auth.users)
-- Note: This is a new table setup - existing data referencing auth.users needs migration
-- For new installations, the id will be a standalone UUID

-- Step 5: Update foreign key references in other tables
-- The qa_reports.performer_id, qa_reports.witness_id, etc. still reference profiles(id)
-- which is fine - they reference by UUID, not by clerk_id

-- Step 6: Fix audit_log table name (API uses audit_logs plural)
-- Create alias view if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE VIEW audit_logs AS SELECT * FROM audit_log;

    -- Create rules for INSERT/UPDATE/DELETE on the view
    CREATE RULE audit_logs_insert AS ON INSERT TO audit_logs
      DO INSTEAD INSERT INTO audit_log VALUES (NEW.*);
  END IF;
END $$;

-- Step 7: Update profiles table to allow NULL id (for Clerk-first users)
-- and generate UUID if not provided
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop the foreign key constraint to auth.users if it exists
-- (This is safe because we're moving to Clerk)
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Step 8: Ensure profiles can be created without referencing auth.users
-- Make sure the table accepts inserts with auto-generated UUIDs
COMMENT ON TABLE profiles IS 'User profiles - linked to Clerk via clerk_id column';
COMMENT ON COLUMN profiles.clerk_id IS 'Clerk user ID from Clerk authentication';
