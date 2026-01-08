-- Equipment Baselines Table
-- Stores per-equipment baseline/reference values for QA tests
-- Supports history tracking - old baselines are kept when new ones are set
-- This is critical for brachytherapy where sources are replaced periodically

CREATE TABLE equipment_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL, -- e.g., 'DBR6', 'DBR10', 'QBR4'

  -- Flexible storage for different baseline types
  values JSONB NOT NULL DEFAULT '{}',
  -- Example values by calculator type:
  -- source_decay_check: {"initial_activity": 10.5, "calibration_date": "2024-01-15", "unit": "Ci"}
  -- position_deviation: {"expected_position": 100.0}
  -- dwell_time: {"set_time": 60.0}
  -- percentage_difference: {"reference_value": 10.2}
  -- timer_linearity: {"time_points": [10, 30, 60, 120]}

  -- Source/Component tracking (for replaceable items like brachytherapy sources)
  source_serial TEXT,  -- Serial number of the source/component this baseline applies to

  -- History tracking
  is_current BOOLEAN DEFAULT true,  -- Only one baseline per equipment+test can be current
  valid_from TIMESTAMPTZ DEFAULT NOW(),  -- When this baseline became active
  valid_until TIMESTAMPTZ,  -- When this baseline was superseded (NULL = still current)
  superseded_by UUID REFERENCES equipment_baselines(id),  -- Link to the baseline that replaced this one

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL

  -- No UNIQUE constraint on (equipment_id, test_id) - we want history!
);

-- Indexes
CREATE INDEX idx_equipment_baselines_equipment ON equipment_baselines(equipment_id);
CREATE INDEX idx_equipment_baselines_test ON equipment_baselines(test_id);
CREATE INDEX idx_equipment_baselines_current ON equipment_baselines(equipment_id, test_id) WHERE is_current = true;
CREATE INDEX idx_equipment_baselines_source ON equipment_baselines(source_serial) WHERE source_serial IS NOT NULL;

-- Ensure only one current baseline per equipment+test combination
CREATE UNIQUE INDEX idx_equipment_baselines_unique_current
  ON equipment_baselines(equipment_id, test_id)
  WHERE is_current = true;

-- RLS Policies
ALTER TABLE equipment_baselines ENABLE ROW LEVEL SECURITY;

-- Users can view baselines for equipment in their organization
CREATE POLICY "Users can view own org baselines"
  ON equipment_baselines FOR SELECT
  USING (
    equipment_id IN (
      SELECT e.id FROM equipment e
      JOIN profiles p ON p.organization_id = e.organization_id
      WHERE p.clerk_id = auth.uid()::text
    )
  );

-- Users can insert baselines for equipment in their organization
CREATE POLICY "Users can insert own org baselines"
  ON equipment_baselines FOR INSERT
  WITH CHECK (
    equipment_id IN (
      SELECT e.id FROM equipment e
      JOIN profiles p ON p.organization_id = e.organization_id
      WHERE p.clerk_id = auth.uid()::text
    )
  );

-- Users can update baselines for equipment in their organization
CREATE POLICY "Users can update own org baselines"
  ON equipment_baselines FOR UPDATE
  USING (
    equipment_id IN (
      SELECT e.id FROM equipment e
      JOIN profiles p ON p.organization_id = e.organization_id
      WHERE p.clerk_id = auth.uid()::text
    )
  );

-- Users can delete baselines for equipment in their organization
CREATE POLICY "Users can delete own org baselines"
  ON equipment_baselines FOR DELETE
  USING (
    equipment_id IN (
      SELECT e.id FROM equipment e
      JOIN profiles p ON p.organization_id = e.organization_id
      WHERE p.clerk_id = auth.uid()::text
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_equipment_baselines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_baselines_updated_at
  BEFORE UPDATE ON equipment_baselines
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_baselines_updated_at();

COMMENT ON TABLE equipment_baselines IS 'Stores per-equipment baseline values for QA test calculators';
COMMENT ON COLUMN equipment_baselines.values IS 'JSONB storage for baseline values specific to each calculator type';
