-- Add source_position_checks column for brachytherapy equipment
-- Allows configuring how many positions to check for source positional accuracy (DBR10)
-- Some facilities check 1 position, others check 3 or more

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS source_position_checks INTEGER DEFAULT NULL;

-- Add check constraint for valid position counts (1-5)
ALTER TABLE equipment ADD CONSTRAINT valid_source_position_checks
  CHECK (source_position_checks IS NULL OR (source_position_checks >= 1 AND source_position_checks <= 5));

-- Set default of 1 for existing brachytherapy equipment
UPDATE equipment
SET source_position_checks = 1
WHERE equipment_type IN ('brachytherapy_hdr', 'brachytherapy_ldr')
  AND source_position_checks IS NULL;

COMMENT ON COLUMN equipment.source_position_checks IS 'Number of positions to check for brachytherapy source positioning QA (1-5)';
