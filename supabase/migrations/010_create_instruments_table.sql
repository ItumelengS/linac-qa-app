-- Create instruments table for QA measurement tools
-- (ion chambers, electrometers, thermometers, barometers, survey meters, etc.)

CREATE TYPE instrument_type AS ENUM (
  'ion_chamber',
  'electrometer',
  'thermometer',
  'barometer',
  'hygrometer',
  'survey_meter',
  'well_chamber',
  'diode',
  'film',
  'mosfet',
  'diamond_detector',
  'scintillator',
  'phantom',
  'other'
);

CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  instrument_type instrument_type NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,

  -- Purchase info
  purchase_date DATE,
  vendor TEXT,

  -- Calibration info
  calibration_certificate TEXT,
  calibration_date DATE,
  calibration_expiry_date DATE,
  calibration_lab TEXT,
  calibration_factor DECIMAL(10, 6),  -- e.g., Nk or ND,w for ion chambers
  calibration_factor_unit TEXT,       -- e.g., Gy/nC, Gy/rdg

  -- Additional factors (for ion chambers)
  electrometer_correction DECIMAL(10, 6) DEFAULT 1.0,
  polarity_correction DECIMAL(10, 6),
  recombination_correction DECIMAL(10, 6),

  -- Status
  active BOOLEAN DEFAULT true,
  location TEXT,  -- Where it's stored
  notes TEXT,

  -- Metadata for additional fields
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Create index for faster lookups
CREATE INDEX idx_instruments_organization ON instruments(organization_id);
CREATE INDEX idx_instruments_type ON instruments(instrument_type);
CREATE INDEX idx_instruments_active ON instruments(organization_id, active);

-- Create index for calibration expiry alerts
CREATE INDEX idx_instruments_calibration_expiry ON instruments(calibration_expiry_date)
WHERE calibration_expiry_date IS NOT NULL AND active = true;

-- Enable RLS
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be bypassed by service role key
