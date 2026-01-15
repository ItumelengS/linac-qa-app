-- Fix: Drop the broken updated_at trigger that references a non-existent column
-- The equipment_baselines table doesn't have an updated_at column

DROP TRIGGER IF EXISTS equipment_baselines_updated_at ON equipment_baselines;
DROP FUNCTION IF EXISTS update_equipment_baselines_updated_at();
