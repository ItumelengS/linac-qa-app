-- Fix equipment_baselines table schema
-- Add missing columns that the application expects

-- Add is_current column (boolean to track the current baseline vs historical ones)
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

-- Add created_by column (references the profile who created the baseline)
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add source_serial column (for brachytherapy source tracking)
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS source_serial TEXT;

-- Add valid_from column (when this baseline became active)
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();

-- Add valid_until column (when this baseline was superseded)
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- Add superseded_by column (reference to the newer baseline that replaced this one)
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES equipment_baselines(id);

-- Add notes column for any additional context
ALTER TABLE equipment_baselines ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index on is_current for faster queries
CREATE INDEX IF NOT EXISTS idx_equipment_baselines_is_current
ON equipment_baselines(equipment_id, test_id, is_current)
WHERE is_current = true;
