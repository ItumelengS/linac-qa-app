-- SRAK (Source Reference Air Kerma Rate) Measurements Table
-- Stores detailed measurements for HDR brachytherapy source calibration

CREATE TABLE IF NOT EXISTS srak_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  report_id UUID REFERENCES qa_reports(id) ON DELETE SET NULL, -- Link to QA report

  -- Source Information (from radioactive_sources or manual entry)
  source_id UUID REFERENCES radioactive_sources(id) ON DELETE SET NULL,
  source_serial VARCHAR(100),
  source_radionuclide VARCHAR(20) DEFAULT 'Ir-192',

  -- Certificate Values
  certificate_srak DECIMAL(12, 3) NOT NULL, -- μGy·m²·h⁻¹ at calibration date
  certificate_date DATE NOT NULL,
  certificate_number VARCHAR(100),
  decayed_srak DECIMAL(12, 3), -- Calculated decayed value at measurement date
  days_since_calibration INTEGER,

  -- Well Chamber Information
  chamber_model VARCHAR(100),
  chamber_serial VARCHAR(100),
  chamber_factor_nsk DECIMAL(12, 6) NOT NULL, -- μGy·m²·h⁻¹·nA⁻¹
  electrometer_model VARCHAR(100),
  electrometer_serial VARCHAR(100),
  electrometer_factor DECIMAL(8, 6) DEFAULT 1.000000,

  -- Applicator correction factor
  applicator_factor DECIMAL(8, 6) DEFAULT 1.029000,
  applicator_type VARCHAR(100),

  -- Sweet Spot
  sweet_spot_position DECIMAL(8, 3), -- mm
  sweet_spot_method VARCHAR(50), -- 'coarse_fine_scan', 'manual', 'previous'

  -- Environmental Conditions
  measured_temperature DECIMAL(5, 2), -- °C
  measured_pressure DECIMAL(8, 3), -- kPa
  reference_temperature DECIMAL(5, 2) DEFAULT 20.0,
  reference_pressure DECIMAL(8, 3) DEFAULT 101.325,
  k_tp DECIMAL(8, 6), -- Temperature-pressure correction factor

  -- Measurements (3 readings at sweet spot)
  reading_1 DECIMAL(10, 4), -- nA
  reading_2 DECIMAL(10, 4),
  reading_3 DECIMAL(10, 4),
  mean_reading DECIMAL(10, 4),

  -- Results
  measured_srak DECIMAL(12, 3), -- μGy·m²·h⁻¹
  deviation_percent DECIMAL(6, 3), -- %
  result VARCHAR(20) CHECK (result IN ('pass', 'fail', 'action_required')),

  -- Metadata
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  performed_by VARCHAR(200),
  performed_by_id UUID REFERENCES profiles(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_srak_measurements_org ON srak_measurements(organization_id);
CREATE INDEX IF NOT EXISTS idx_srak_measurements_equipment ON srak_measurements(equipment_id);
CREATE INDEX IF NOT EXISTS idx_srak_measurements_date ON srak_measurements(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_srak_measurements_source ON srak_measurements(source_id);

-- RLS Policies
ALTER TABLE srak_measurements ENABLE ROW LEVEL SECURITY;

-- Users can view SRAK measurements from their organization
CREATE POLICY "Users can view own org SRAK measurements" ON srak_measurements
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- Physicists and admins can insert/update/delete
CREATE POLICY "Physicists can manage SRAK measurements" ON srak_measurements
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE clerk_id = auth.jwt() ->> 'sub'
    AND role IN ('admin', 'physicist')
  ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_srak_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_srak_measurements_timestamp
  BEFORE UPDATE ON srak_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_srak_measurements_updated_at();

-- Comment on table
COMMENT ON TABLE srak_measurements IS 'SRAK (Source Reference Air Kerma Rate) measurements for HDR brachytherapy source calibration';
