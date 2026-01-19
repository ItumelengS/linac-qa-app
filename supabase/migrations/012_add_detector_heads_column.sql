-- Add detector_heads column for nuclear medicine equipment
-- SPECT/CT and gamma cameras typically have 1, 2, or 3 detector heads

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS detector_heads INTEGER DEFAULT NULL;

-- Add check constraint for valid detector head counts (1-3)
ALTER TABLE equipment ADD CONSTRAINT valid_detector_heads
  CHECK (detector_heads IS NULL OR (detector_heads >= 1 AND detector_heads <= 3));

-- Set default of 2 for existing SPECT/CT equipment (most common configuration)
UPDATE equipment
SET detector_heads = 2
WHERE equipment_type IN ('spect_ct', 'spect', 'gamma_camera')
  AND detector_heads IS NULL;

COMMENT ON COLUMN equipment.detector_heads IS 'Number of detector heads for gamma cameras and SPECT systems (1, 2, or 3)';
