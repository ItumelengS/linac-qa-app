-- Radioactive Source Inventory Management
-- For tracking sealed sources, reference sources, and radionuclides per license requirements

-- Source status enum
CREATE TYPE source_status AS ENUM (
  'active',        -- In use, at specified location
  'stored',        -- In storage, not actively used
  'lost',          -- Source has been lost
  'stolen',        -- Source has been stolen
  'discarded',     -- Properly disposed of
  'transferred',   -- Transferred to another facility
  'decayed'        -- Activity too low, no longer usable
);

-- Source category enum
CREATE TYPE source_category AS ENUM (
  'nuclear_medicine',
  'therapy',
  'brachytherapy',
  'reference_source',
  'medical_physics',
  'calibration'
);

-- Source form enum
CREATE TYPE source_form AS ENUM (
  'sealed',
  'liquid',
  'capsule',
  'gas',
  'wire',
  'seeds',
  'generator',
  'other'
);

-- Main radioactive sources table
CREATE TABLE radioactive_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source identification
  radionuclide VARCHAR(20) NOT NULL,  -- e.g., 'Tc-99m', 'I-131', 'Cs-137'
  source_form source_form NOT NULL DEFAULT 'sealed',
  description TEXT,  -- e.g., 'Eye applicator, RO Dept'

  -- Serial numbers and identifiers
  serial_number VARCHAR(100),
  container_serial VARCHAR(100),
  license_item_number INTEGER,  -- Item number on the license (1, 2, 3, etc.)

  -- Activity information
  initial_activity DECIMAL(15, 6) NOT NULL,
  activity_unit VARCHAR(10) NOT NULL DEFAULT 'MBq',  -- kBq, MBq, GBq, TBq, Ci, mCi, uCi
  calibration_date DATE NOT NULL,
  half_life_days DECIMAL(15, 6),  -- Optional override, otherwise calculated from radionuclide

  -- Classification
  category source_category NOT NULL DEFAULT 'nuclear_medicine',
  room_type VARCHAR(50),  -- e.g., 'Type B', 'Type C', 'RIA LAB'

  -- Location
  location_building VARCHAR(100),
  location_floor VARCHAR(50),
  location_room VARCHAR(100),
  location_department VARCHAR(100),
  location_detail TEXT,  -- Additional location description

  -- Status tracking
  status source_status NOT NULL DEFAULT 'active',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_by UUID REFERENCES profiles(id),
  status_notes TEXT,

  -- Acquisition/disposal info
  acquired_date DATE,
  acquired_from VARCHAR(200),
  disposed_date DATE,
  disposed_method TEXT,
  disposal_certificate VARCHAR(100),

  -- Transfer info (if transferred)
  transferred_to VARCHAR(200),
  transfer_date DATE,
  transfer_authorization VARCHAR(100),

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for common queries
CREATE INDEX idx_sources_org ON radioactive_sources(organization_id);
CREATE INDEX idx_sources_radionuclide ON radioactive_sources(radionuclide);
CREATE INDEX idx_sources_status ON radioactive_sources(status);
CREATE INDEX idx_sources_category ON radioactive_sources(category);
CREATE INDEX idx_sources_location ON radioactive_sources(location_department, location_room);

-- Status history table for audit trail
CREATE TABLE source_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES radioactive_sources(id) ON DELETE CASCADE,

  old_status source_status,
  new_status source_status NOT NULL,

  -- Location change tracking
  old_location_room VARCHAR(100),
  new_location_room VARCHAR(100),
  old_location_department VARCHAR(100),
  new_location_department VARCHAR(100),

  -- Change details
  change_reason TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_by_name VARCHAR(200),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_source ON source_status_history(source_id);
CREATE INDEX idx_status_history_date ON source_status_history(changed_at);

-- Standard half-lives for common radionuclides (in days)
CREATE TABLE radionuclide_data (
  radionuclide VARCHAR(20) PRIMARY KEY,
  half_life_days DECIMAL(15, 6) NOT NULL,
  half_life_display VARCHAR(50),  -- Human readable, e.g., "6.01 hours"
  decay_mode VARCHAR(50),
  gamma_energy_kev DECIMAL(10, 2),
  common_use TEXT
);

-- Insert common radionuclides
INSERT INTO radionuclide_data (radionuclide, half_life_days, half_life_display, decay_mode, gamma_energy_kev, common_use) VALUES
-- Nuclear Medicine - Short-lived
('Tc-99m', 0.2507, '6.01 hours', 'IT', 140.5, 'General nuclear medicine imaging'),
('F-18', 0.0762, '109.8 minutes', 'β+', 511, 'PET imaging'),
('Ga-68', 0.0472, '67.7 minutes', 'β+', 511, 'PET imaging'),
('Rb-82', 0.000868, '1.25 minutes', 'β+', 511, 'Cardiac PET'),
('I-123', 0.5513, '13.2 hours', 'EC', 159, 'Thyroid imaging'),
('In-111', 2.8047, '2.8 days', 'EC', 245, 'Infection/tumor imaging'),
('Tl-201', 3.0417, '73 hours', 'EC', 167, 'Cardiac imaging'),

-- Nuclear Medicine - Medium-lived
('I-131', 8.0252, '8.02 days', 'β-', 364, 'Thyroid therapy/imaging'),
('Ga-67', 3.2617, '78.3 hours', 'EC', 300, 'Tumor/infection imaging'),
('Cr-51', 27.7025, '27.7 days', 'EC', 320, 'RBC labeling'),
('Se-75', 119.779, '119.8 days', 'EC', 265, 'Protein studies'),

-- Nuclear Medicine - Long-lived
('Co-57', 271.74, '271.7 days', 'EC', 122, 'Reference source'),
('Co-58', 70.86, '70.9 days', 'β+/EC', 811, 'Research'),

-- Therapy isotopes
('Sr-89', 50.53, '50.5 days', 'β-', NULL, 'Bone pain palliation'),
('Sr-90', 10512, '28.8 years', 'β-', NULL, 'Eye applicator'),
('Y-90', 2.6684, '64 hours', 'β-', NULL, 'Radioembolization'),
('P-32', 14.268, '14.3 days', 'β-', NULL, 'Polycythemia vera'),
('I-125', 59.49, '59.5 days', 'EC', 35, 'Brachytherapy seeds'),

-- Brachytherapy
('Ir-192', 73.83, '73.8 days', 'β-/EC', 380, 'HDR brachytherapy'),
('Au-198', 2.6943, '2.69 days', 'β-', 412, 'Interstitial therapy'),
('Pd-103', 16.991, '17 days', 'EC', 21, 'Prostate seeds'),
('Cs-131', 9.689, '9.7 days', 'EC', 30, 'Brachytherapy'),

-- Reference/Calibration sources
('Cs-137', 10983.5, '30.1 years', 'β-', 662, 'Calibration source'),
('Co-60', 1925.2, '5.27 years', 'β-', 1250, 'Teletherapy/calibration'),
('Ra-226', 584310, '1600 years', 'α', 186, 'Historical reference'),
('Am-241', 157788, '432 years', 'α', 59, 'Reference source'),
('Ba-133', 3847.9, '10.5 years', 'EC', 356, 'Calibration'),
('Eu-152', 4935.5, '13.5 years', 'EC/β-', 344, 'Calibration'),
('Na-22', 950.6, '2.6 years', 'β+', 511, 'PET calibration'),

-- Other
('Xe-133', 5.2475, '5.25 days', 'β-', 81, 'Lung ventilation'),
('Kr-81m', 0.0000912, '13.1 seconds', 'IT', 190, 'Lung ventilation'),
('Fe-59', 44.495, '44.5 days', 'β-', 1099, 'Iron studies'),
('H-3', 4500.87, '12.3 years', 'β-', NULL, 'Research'),
('C-14', 2092897.5, '5730 years', 'β-', NULL, 'Research'),
('Br-82', 1.4708, '35.3 hours', 'β-', 776, 'Research');

-- Function to calculate current activity
CREATE OR REPLACE FUNCTION calculate_current_activity(
  p_initial_activity DECIMAL,
  p_calibration_date DATE,
  p_half_life_days DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  days_elapsed DECIMAL;
  decay_constant DECIMAL;
BEGIN
  IF p_half_life_days IS NULL OR p_half_life_days <= 0 THEN
    RETURN p_initial_activity;
  END IF;

  days_elapsed := EXTRACT(EPOCH FROM (CURRENT_DATE - p_calibration_date)) / 86400.0;
  decay_constant := LN(2) / p_half_life_days;

  RETURN p_initial_activity * EXP(-decay_constant * days_elapsed);
END;
$$ LANGUAGE plpgsql;

-- View for sources with calculated current activity
CREATE OR REPLACE VIEW sources_with_activity AS
SELECT
  s.*,
  COALESCE(s.half_life_days, r.half_life_days) AS effective_half_life,
  r.half_life_display,
  r.decay_mode,
  calculate_current_activity(
    s.initial_activity,
    s.calibration_date,
    COALESCE(s.half_life_days, r.half_life_days)
  ) AS current_activity,
  EXTRACT(EPOCH FROM (CURRENT_DATE - s.calibration_date)) / 86400.0 AS days_since_calibration
FROM radioactive_sources s
LEFT JOIN radionuclide_data r ON UPPER(s.radionuclide) = UPPER(r.radionuclide);

-- Trigger to update status_changed_at and log history
CREATE OR REPLACE FUNCTION log_source_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR
     OLD.location_room IS DISTINCT FROM NEW.location_room OR
     OLD.location_department IS DISTINCT FROM NEW.location_department THEN

    INSERT INTO source_status_history (
      source_id,
      old_status,
      new_status,
      old_location_room,
      new_location_room,
      old_location_department,
      new_location_department,
      change_reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      OLD.location_room,
      NEW.location_room,
      OLD.location_department,
      NEW.location_department,
      NEW.status_notes,
      NEW.status_changed_by
    );

    NEW.status_changed_at := NOW();
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_source_status_change
  BEFORE UPDATE ON radioactive_sources
  FOR EACH ROW
  EXECUTE FUNCTION log_source_status_change();

-- Comments
COMMENT ON TABLE radioactive_sources IS 'Inventory of radioactive sources for license compliance';
COMMENT ON TABLE source_status_history IS 'Audit trail of source status and location changes';
COMMENT ON TABLE radionuclide_data IS 'Reference data for common radionuclides including half-lives';
COMMENT ON VIEW sources_with_activity IS 'Sources with calculated current activity based on decay';
