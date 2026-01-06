-- SASQART QA System - Initial Schema
-- Multi-tenant SaaS for radiation oncology quality assurance

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS (Tenants)
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  max_equipment INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROFILES (Users linked to auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'therapist' CHECK (role IN ('admin', 'physicist', 'therapist')),
  hpcsa_number TEXT, -- Health Professions Council of South Africa registration
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EQUIPMENT TYPES
-- ============================================================================
CREATE TYPE equipment_type AS ENUM (
  'linac',
  'bore_linac',
  'linac_srs',
  'cobalt60',
  'ct_simulator',
  'conventional_simulator',
  'tps',
  'brachytherapy_hdr',
  'brachytherapy_ldr',
  'kilovoltage',
  'kilovoltage_intraop',
  'gamma_knife',
  'mlc',
  'epid',
  'record_verify',
  'imrt_vmat',
  'radiation_protection'
);

-- ============================================================================
-- EQUIPMENT
-- ============================================================================
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_type equipment_type NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  room_number TEXT,
  install_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  active BOOLEAN DEFAULT true,

  -- Energy configurations (JSON arrays for flexibility)
  photon_energies JSONB DEFAULT '[]'::jsonb,  -- e.g., ["6MV", "10MV", "15MV"]
  electron_energies JSONB DEFAULT '[]'::jsonb, -- e.g., ["6MeV", "9MeV", "12MeV"]
  fff_energies JSONB DEFAULT '[]'::jsonb,     -- Flattening Filter Free energies

  -- Brachytherapy specific
  source_type TEXT,
  source_strength NUMERIC,
  source_calibration_date DATE,

  -- CT specific
  tube_serial TEXT,

  -- Additional metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

CREATE INDEX idx_equipment_org ON equipment(organization_id);
CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_active ON equipment(active);

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- QA TEST DEFINITIONS (SASQART Standards)
-- ============================================================================
CREATE TABLE qa_test_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type equipment_type NOT NULL,
  test_id TEXT NOT NULL, -- e.g., "DL1", "ML5", "AL6"
  frequency TEXT NOT NULL CHECK (frequency IN (
    'daily', 'weekly', 'monthly', 'quarterly',
    'biannual', 'annual', 'biennial',
    'patient_specific', 'commissioning', 'as_needed'
  )),
  description TEXT NOT NULL,
  tolerance TEXT,
  action_level TEXT,
  category TEXT, -- For grouping tests in UI
  requires_measurement BOOLEAN DEFAULT false,
  measurement_unit TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(equipment_type, test_id)
);

CREATE INDEX idx_qa_test_def_equipment ON qa_test_definitions(equipment_type);
CREATE INDEX idx_qa_test_def_frequency ON qa_test_definitions(frequency);

-- ============================================================================
-- QA REPORTS
-- ============================================================================
CREATE TABLE qa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  qa_type TEXT NOT NULL CHECK (qa_type IN (
    'daily', 'weekly', 'monthly', 'quarterly',
    'biannual', 'annual', 'biennial',
    'patient_specific', 'commissioning', 'as_needed'
  )),
  date DATE NOT NULL,

  -- Personnel
  performer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performer_name TEXT NOT NULL,
  witness_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  witness_name TEXT,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'conditional')),

  -- Comments and notes
  comments TEXT,
  corrective_actions TEXT,

  -- Signature (base64 encoded or URL)
  signature TEXT,

  -- Energy context (for energy-specific QA)
  energy TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_qa_reports_org ON qa_reports(organization_id);
CREATE INDEX idx_qa_reports_equipment ON qa_reports(equipment_id);
CREATE INDEX idx_qa_reports_date ON qa_reports(date DESC);
CREATE INDEX idx_qa_reports_type ON qa_reports(qa_type);
CREATE INDEX idx_qa_reports_status ON qa_reports(status);

CREATE TRIGGER update_qa_reports_updated_at
  BEFORE UPDATE ON qa_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- QA TEST RESULTS
-- ============================================================================
CREATE TABLE qa_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES qa_reports(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL, -- References qa_test_definitions.test_id

  -- Result
  status TEXT CHECK (status IN ('pass', 'fail', 'na', '')),

  -- Measurements (when applicable)
  measurement NUMERIC,
  measurement_unit TEXT,
  baseline_value NUMERIC,
  deviation NUMERIC,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_tests_report ON qa_tests(report_id);
CREATE INDEX idx_qa_tests_test_id ON qa_tests(test_id);
CREATE INDEX idx_qa_tests_status ON qa_tests(status);

-- ============================================================================
-- OUTPUT READINGS (For trend tracking)
-- ============================================================================
CREATE TABLE output_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  report_id UUID REFERENCES qa_reports(id) ON DELETE SET NULL,

  date DATE NOT NULL,
  energy TEXT NOT NULL, -- e.g., "6MV", "10MV", "6MeV"

  -- Measurement values
  reading NUMERIC NOT NULL,
  reference_value NUMERIC NOT NULL,
  deviation NUMERIC GENERATED ALWAYS AS (
    CASE WHEN reference_value != 0
    THEN ((reading - reference_value) / reference_value * 100)
    ELSE 0
    END
  ) STORED,

  -- Conditions
  temperature NUMERIC,
  pressure NUMERIC,
  humidity NUMERIC,

  -- Context
  field_size TEXT DEFAULT '10x10',
  depth TEXT DEFAULT 'dmax',
  ssd TEXT DEFAULT '100',
  chamber_id TEXT,
  electrometer_id TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_output_readings_org ON output_readings(organization_id);
CREATE INDEX idx_output_readings_equipment ON output_readings(equipment_id);
CREATE INDEX idx_output_readings_date ON output_readings(date DESC);
CREATE INDEX idx_output_readings_energy ON output_readings(energy);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,

  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'login', 'logout'
  resource_type TEXT, -- e.g., 'qa_report', 'equipment', 'user'
  resource_id UUID,

  details JSONB, -- Stores before/after values or additional context

  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_at DESC);

-- ============================================================================
-- INVITATIONS (For onboarding users to organizations)
-- ============================================================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'therapist' CHECK (role IN ('admin', 'physicist', 'therapist')),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
