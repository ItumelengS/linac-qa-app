# SASQART QA System - Complete Project Specification

## Project Overview

Build a multi-tenant SaaS for radiation oncology quality assurance management, targeting South African departments. Must be fully SASQART compliant.

**Stack:** Next.js 14 (App Router) + Supabase (Auth, Database, Row-Level Security)
**Deployment:** Vercel
**Target Users:** Medical physicists, radiation therapists, oncologists

---

## Business Model

- Per-linac pricing: R500-1500/month
- Multi-tenant: Each hospital is an "organization"
- Free tier: Your own hospital (proof it works)

---

## Core Features Required

1. **Multi-tenant architecture** with Supabase RLS
2. **All SASQART QA checklists** (see complete list below)
3. **Equipment management** with serial numbers, energy configurations
4. **User roles**: Admin, Physicist, Therapist
5. **Audit trail** for compliance (21 CFR Part 11 style)
6. **Output trend tracking** with charts
7. **PDF report generation**
8. **SAHPRA inspection package export**
9. **Mobile-responsive** (therapists use tablets at machines)

---

## Database Schema (Supabase)

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users belong to organizations
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'physicist', 'therapist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment types
CREATE TYPE equipment_type AS ENUM (
  'linac',
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
  'record_verify'
);

-- Equipment/Units
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  equipment_type equipment_type NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  install_date DATE,
  active BOOLEAN DEFAULT true,
  -- Energy configurations (JSON for flexibility)
  photon_energies JSONB DEFAULT '[]',
  electron_energies JSONB DEFAULT '[]',
  fff_energies JSONB DEFAULT '[]',
  -- Brachytherapy specific
  source_type TEXT,
  source_strength NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA Reports
CREATE TABLE qa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  equipment_id UUID REFERENCES equipment(id) NOT NULL,
  qa_type TEXT NOT NULL, -- daily, weekly, monthly, quarterly, biannual, annual, biennial, patient_specific, commissioning
  date DATE NOT NULL,
  performer_id UUID REFERENCES profiles(id),
  performer_name TEXT NOT NULL,
  witness_name TEXT,
  comments TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Individual test results
CREATE TABLE qa_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES qa_reports(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL, -- DL1, ML5, etc.
  status TEXT CHECK (status IN ('pass', 'fail', 'na', '')),
  measurement NUMERIC,
  notes TEXT
);

-- Output readings for trends
CREATE TABLE output_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  equipment_id UUID REFERENCES equipment(id) NOT NULL,
  date DATE NOT NULL,
  energy TEXT NOT NULL,
  reading NUMERIC NOT NULL,
  reference_value NUMERIC NOT NULL,
  deviation NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE output_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their organization's data)
CREATE POLICY "Users can view own org" ON organizations
  FOR SELECT USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own org equipment" ON equipment
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own org reports" ON qa_reports
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Add similar policies for other tables...
```

---

## Complete SASQART Test Definitions

Below are ALL tests from SASQART Practice Guidelines. Store these as seed data.

### Table 2: Cobalt-60 Teletherapy Units

```json
{
  "equipment_type": "cobalt60",
  "tests": [
    {"id": "DCO1", "frequency": "daily", "description": "Door interlock or last person out", "tolerance": "Functional", "action": null},
    {"id": "DCO2", "frequency": "daily", "description": "Beam status indicators", "tolerance": "Functional", "action": null},
    {"id": "DCO3", "frequency": "daily", "description": "Patient audio-visual monitors", "tolerance": "Functional", "action": null},
    {"id": "DCO4", "frequency": "daily", "description": "Lasers/cross-wires", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "DCO5", "frequency": "daily", "description": "Optical distance indicator", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "DCO6", "frequency": "daily", "description": "Optical back pointer", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "DCO7", "frequency": "daily", "description": "Field size indicator", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MCO1", "frequency": "monthly", "description": "Motion interlock", "tolerance": "Functional", "action": null},
    {"id": "MCO2", "frequency": "monthly", "description": "Couch brakes", "tolerance": "Functional", "action": null},
    {"id": "MCO3", "frequency": "monthly", "description": "Room radiation monitors", "tolerance": "Functional", "action": null},
    {"id": "MCO4", "frequency": "monthly", "description": "Emergency off", "tolerance": "Functional", "action": null},
    {"id": "MCO5", "frequency": "monthly", "description": "Beam interrupt/counters", "tolerance": "Functional", "action": null},
    {"id": "MCO6", "frequency": "monthly", "description": "Head swivel lock", "tolerance": "Functional", "action": null},
    {"id": "MCO7", "frequency": "monthly", "description": "Wedge, tray interlocks", "tolerance": "Functional", "action": null},
    {"id": "MCO8", "frequency": "monthly", "description": "Gantry angle readouts", "tolerance": "0.5°", "action": "1°"},
    {"id": "MCO9", "frequency": "monthly", "description": "Collimator angle readouts", "tolerance": "0.5°", "action": "1°"},
    {"id": "MCO10", "frequency": "monthly", "description": "Couch position readouts", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MCO11", "frequency": "monthly", "description": "Couch isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MCO12", "frequency": "monthly", "description": "Couch angle", "tolerance": "0.5°", "action": "1°"},
    {"id": "MCO13", "frequency": "monthly", "description": "Optical distance indicator (extended)", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MCO14", "frequency": "monthly", "description": "Light/radiation field coincidence", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MCO15", "frequency": "monthly", "description": "Beam flatness/symmetry", "tolerance": "2%", "action": "3%"},
    {"id": "MCO16", "frequency": "monthly", "description": "Output constancy", "tolerance": "2%", "action": "3%"},
    {"id": "MCO17", "frequency": "monthly", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "ACO1", "frequency": "annual", "description": "Physical wedge transmission", "tolerance": "2%", "action": "3%"},
    {"id": "ACO2", "frequency": "annual", "description": "Tray transmission", "tolerance": "2%", "action": "3%"},
    {"id": "ACO3", "frequency": "annual", "description": "Absolute calibration (SSDL)", "tolerance": "2%", "action": "3%"},
    {"id": "ACO4", "frequency": "annual", "description": "PDD/TMR check", "tolerance": "2%", "action": "3%"},
    {"id": "ACO5", "frequency": "annual", "description": "Collimator rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACO6", "frequency": "annual", "description": "Gantry rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACO7", "frequency": "annual", "description": "Independent QC review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 3: External Kilovoltage X-ray Therapy

```json
{
  "equipment_type": "kilovoltage",
  "tests": [
    {"id": "DK1", "frequency": "daily", "description": "Patient monitoring audio-visual devices", "tolerance": "Functional", "action": null},
    {"id": "DK2", "frequency": "daily", "description": "Door closing mechanism and interlock", "tolerance": "Functional", "action": null},
    {"id": "DK3", "frequency": "daily", "description": "Couch movement and brakes", "tolerance": "Functional", "action": null},
    {"id": "DK4", "frequency": "daily", "description": "Unit motions and motion stops", "tolerance": "Functional", "action": null},
    {"id": "DK5", "frequency": "daily", "description": "Interlocks for added filters/kV-filter choice", "tolerance": "Functional", "action": null},
    {"id": "DK6", "frequency": "daily", "description": "Beam status indicators", "tolerance": "Functional", "action": null},
    {"id": "DK7", "frequency": "daily", "description": "Beam-off at key-off test", "tolerance": "Functional", "action": null},
    {"id": "DK8", "frequency": "daily", "description": "kV and mA indicators", "tolerance": "Functional", "action": null},
    {"id": "DK9", "frequency": "daily", "description": "Backup timer/monitor unit channel check", "tolerance": "1%", "action": "2%"},
    {"id": "MK1", "frequency": "monthly", "description": "Mechanical stability and safety", "tolerance": "Functional", "action": null},
    {"id": "MK2", "frequency": "monthly", "description": "Cone selection and competency", "tolerance": "Functional", "action": null},
    {"id": "MK3", "frequency": "monthly", "description": "Physical distance indicators", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "MK4", "frequency": "monthly", "description": "Light/x-ray field size indicator", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "MK5", "frequency": "monthly", "description": "Light/x-ray field coincidence", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "MK6", "frequency": "monthly", "description": "Dosimetric test: Output check", "tolerance": "3%", "action": "5%"},
    {"id": "MK7", "frequency": "monthly", "description": "Emergency off test", "tolerance": "Functional", "action": null},
    {"id": "MK8", "frequency": "monthly", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "AK1", "frequency": "annual", "description": "Angle readouts verification", "tolerance": "1°", "action": "2°"},
    {"id": "AK2", "frequency": "annual", "description": "Flatness and symmetry", "tolerance": "3%", "action": "5%"},
    {"id": "AK3", "frequency": "annual", "description": "Timer and end-effect error", "tolerance": "1%", "action": "2%"},
    {"id": "AK4", "frequency": "annual", "description": "Absolute calibration", "tolerance": "3%", "action": "5%"},
    {"id": "AK5", "frequency": "annual", "description": "HVL measurement", "tolerance": "10%", "action": "15%"},
    {"id": "AK6", "frequency": "annual", "description": "Output factors (all cones)", "tolerance": "3%", "action": "5%"},
    {"id": "AK7", "frequency": "annual", "description": "Independent QC review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 4: Internal Kilovoltage (Intraoperative)

```json
{
  "equipment_type": "kilovoltage_intraop",
  "tests": [
    {"id": "DKI1", "frequency": "daily", "description": "PDA Source Check (Isotropy)", "tolerance": "±10%", "action": "15%"},
    {"id": "DKI2", "frequency": "daily", "description": "PAICH Output Check (Dose Rate)", "tolerance": "±5%", "action": "10%"},
    {"id": "DKI3", "frequency": "daily", "description": "Patient vitals monitoring (Vitals Screen)", "tolerance": "Functional", "action": null},
    {"id": "DKI4", "frequency": "daily", "description": "Applicator integrity", "tolerance": "Not Damaged", "action": null},
    {"id": "MKI1", "frequency": "monthly", "description": "PDA Source Check (Isotropy)", "tolerance": "±10%", "action": "15%"},
    {"id": "MKI2", "frequency": "monthly", "description": "PAICH Output Check (Dose Rate)", "tolerance": "±5%", "action": "10%"},
    {"id": "SKI1", "frequency": "biannual", "description": "Chamber Constancy Check", "tolerance": "±1%", "action": null},
    {"id": "SKI2", "frequency": "biannual", "description": "Environmental dose survey", "tolerance": "License conditions", "action": null},
    {"id": "AKI1", "frequency": "annual", "description": "Alignment (Probe Adjuster)", "tolerance": "0.1", "action": "0.2"},
    {"id": "AKI2", "frequency": "annual", "description": "Steering (Dynamic Offsets)", "tolerance": "Successful", "action": null},
    {"id": "AKI3", "frequency": "annual", "description": "Output – using chamber in water", "tolerance": "±5%", "action": "10%"},
    {"id": "AKI4", "frequency": "annual", "description": "Isotropy – using chamber or TLDs", "tolerance": "±5%", "action": "10%"},
    {"id": "AKI5", "frequency": "annual", "description": "Depth Dose", "tolerance": "±5%", "action": "10%"},
    {"id": "AKI6", "frequency": "annual", "description": "Calibration", "tolerance": "Manufacturer spec", "action": null},
    {"id": "AKI7", "frequency": "annual", "description": "Date and time", "tolerance": "±5 min", "action": null},
    {"id": "AKI8", "frequency": "annual", "description": "Temperature", "tolerance": "±1°C", "action": null},
    {"id": "AKI9", "frequency": "annual", "description": "Pressure", "tolerance": "±2 mbar", "action": null},
    {"id": "AKI10", "frequency": "annual", "description": "Independent quality control review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 5: CT Scanners and CT-Simulators

```json
{
  "equipment_type": "ct_simulator",
  "tests": [
    {"id": "DCS1", "frequency": "daily", "description": "Beam status indicators", "tolerance": "Functional", "action": null},
    {"id": "DCS2", "frequency": "daily", "description": "CT number for water – mean (accuracy)", "tolerance": "0 ± 3 HU", "action": "0 ± 5 HU"},
    {"id": "DCS3", "frequency": "daily", "description": "CT number for water – standard deviation (noise)", "tolerance": "5 HU", "action": "10 HU"},
    {"id": "DCS4", "frequency": "daily", "description": "CT number for water – mean vs position (uniformity)", "tolerance": "5 HU", "action": "10 HU"},
    {"id": "DCS5", "frequency": "daily", "description": "Audio-video intercom systems", "tolerance": "Functional", "action": null},
    {"id": "DCS6", "frequency": "daily", "description": "Respiratory and surface monitoring system", "tolerance": "Functional", "action": null},
    {"id": "DCS7", "frequency": "daily", "description": "4D-CT: Calibration verification", "tolerance": "Correct", "action": null},
    {"id": "BACS1", "frequency": "biannual", "description": "Emergency off buttons", "tolerance": "Functional", "action": null},
    {"id": "BACS2", "frequency": "biannual", "description": "Lasers: Alignment and motion", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "BACS3", "frequency": "biannual", "description": "CT number accuracy of other material", "tolerance": "4 HU", "action": "10 HU"},
    {"id": "BACS4", "frequency": "biannual", "description": "Low contrast resolution", "tolerance": "Reproducible", "action": null},
    {"id": "BACS5", "frequency": "biannual", "description": "High contrast resolution (in-plane)", "tolerance": "5 lp/cm", "action": null},
    {"id": "BACS6", "frequency": "biannual", "description": "Slice thickness/sensitivity profile", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "BACS7", "frequency": "biannual", "description": "Artifacts", "tolerance": "Acceptable", "action": null},
    {"id": "BACS8", "frequency": "biannual", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "ACS1", "frequency": "annual", "description": "Gantry tilt (where used)", "tolerance": "1°", "action": "2°"},
    {"id": "ACS2", "frequency": "annual", "description": "Slice localisation from pilot", "tolerance": "0.5", "action": "1"},
    {"id": "ACS3", "frequency": "annual", "description": "Lasers: Parallel to scan plane", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACS4", "frequency": "annual", "description": "Lasers: Orthogonality", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACS5", "frequency": "annual", "description": "Lasers: Position from scan plane", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACS6", "frequency": "annual", "description": "Lasers: Linearity of translatable lasers", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACS7", "frequency": "annual", "description": "Couch level: Lateral and longitudinal", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACS8", "frequency": "annual", "description": "Couch motions: Vertical and longitudinal", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ACS9", "frequency": "annual", "description": "Independent quality control review", "tolerance": "Complete", "action": null},
    {"id": "BECS1", "frequency": "biennial", "description": "CT number accuracy (RED)", "tolerance": "0.02 RED", "action": "0.03 RED"},
    {"id": "BECS2", "frequency": "biennial", "description": "Radiation Dose (CTDIvol)", "tolerance": "10%", "action": "15%"},
    {"id": "BECS3", "frequency": "biennial", "description": "4D-CT: Radiation Dose (CTDIvol)", "tolerance": "10%", "action": "15%"},
    {"id": "BECS4", "frequency": "biennial", "description": "4D-CT: Amplitude and periodicity", "tolerance": "1 mm, 0.1 s", "action": null},
    {"id": "BECS5", "frequency": "biennial", "description": "4D-CT: Reconstruction and phase binning", "tolerance": "Functional", "action": null},
    {"id": "BECS6", "frequency": "biennial", "description": "4D-CT: Amplitude of reconstructed target", "tolerance": "2 mm", "action": null},
    {"id": "BECS7", "frequency": "biennial", "description": "4D-CT: Spatial integrity and positioning", "tolerance": "2 mm", "action": null},
    {"id": "BECS8", "frequency": "biennial", "description": "4D-CT: CT number accuracy and std dev", "tolerance": "10 HU", "action": null},
    {"id": "BECS9", "frequency": "biennial", "description": "4D-CT: High contrast resolution", "tolerance": "5 lp/cm", "action": null},
    {"id": "BECS10", "frequency": "biennial", "description": "4D-CT: Low contrast resolution", "tolerance": "Reproducible", "action": null},
    {"id": "BECS11", "frequency": "biennial", "description": "4D-CT: Slice thickness", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "BECS12", "frequency": "biennial", "description": "4D-CT: Intensity projection reconstruction", "tolerance": "2 mm/10 HU", "action": null},
    {"id": "BECS13", "frequency": "biennial", "description": "4D-CT: Import into TPS", "tolerance": "Correct", "action": null}
  ]
}
```

### Table 18: Brachytherapy HDR/PDR/LDR Remote Afterloaders

```json
{
  "equipment_type": "brachytherapy_hdr",
  "tests": [
    {"id": "DBR1", "frequency": "daily", "description": "Door interlock/last person out", "tolerance": "Functional", "action": null},
    {"id": "DBR2", "frequency": "daily", "description": "Treatment interrupt", "tolerance": "Functional", "action": null},
    {"id": "DBR3", "frequency": "daily", "description": "Emergency off (console)", "tolerance": "Functional", "action": null},
    {"id": "DBR4", "frequency": "daily", "description": "Room radiation monitor(s)", "tolerance": "Functional", "action": null},
    {"id": "DBR5", "frequency": "daily", "description": "Room radiation warning lights", "tolerance": "Functional", "action": null},
    {"id": "DBR6", "frequency": "daily", "description": "Console displays (status, date, time, source strength)", "tolerance": "Verify", "action": null},
    {"id": "DBR7", "frequency": "daily", "description": "Printer operation, Paper supply", "tolerance": "Functional", "action": null},
    {"id": "DBR8", "frequency": "daily", "description": "Data transfer from Planning Computer", "tolerance": "Functional", "action": null},
    {"id": "DBR9", "frequency": "daily", "description": "Audio/Visual communication system", "tolerance": "Functional", "action": null},
    {"id": "DBR10", "frequency": "daily", "description": "Source positional accuracy", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "DBR11", "frequency": "daily", "description": "Dwell time accuracy", "tolerance": "1%", "action": "2%"},
    {"id": "DBR12", "frequency": "daily", "description": "PDR Sequencing", "tolerance": "Functional", "action": null},
    {"id": "QBR1", "frequency": "quarterly", "description": "Mechanical integrity of applicators, guide tube", "tolerance": "Functional", "action": null},
    {"id": "QBR2", "frequency": "quarterly", "description": "In-room emergency off buttons", "tolerance": "Functional", "action": null},
    {"id": "QBR3", "frequency": "quarterly", "description": "Power failure recovery", "tolerance": "Functional", "action": null},
    {"id": "QBR4", "frequency": "quarterly", "description": "Source strength measurement", "tolerance": "3%", "action": "5%"},
    {"id": "QBR5", "frequency": "quarterly", "description": "Source positional accuracy (autoradiograph)", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "QBR6", "frequency": "quarterly", "description": "Dwell time accuracy (long dwell)", "tolerance": "1%", "action": "2%"},
    {"id": "ABR1", "frequency": "annual", "description": "Transit dose", "tolerance": "Characterize", "action": null},
    {"id": "ABR2", "frequency": "annual", "description": "Timer linearity", "tolerance": "1%", "action": "2%"},
    {"id": "ABR3", "frequency": "annual", "description": "Length of source guide tube", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ABR4", "frequency": "annual", "description": "Independent QC review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 19 & 20: EPID (Portal Imaging)

```json
{
  "equipment_type": "epid",
  "tests": [
    {"id": "DE1", "frequency": "daily", "description": "Mechanical and Electrical integrity", "tolerance": "Functional", "action": null},
    {"id": "DE2", "frequency": "daily", "description": "Functionality and Repositioning", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ME1", "frequency": "monthly", "description": "Collision interlocks", "tolerance": "Functional", "action": null},
    {"id": "ME2", "frequency": "monthly", "description": "Positioning in the imaging plane", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ME3", "frequency": "monthly", "description": "Image quality", "tolerance": "Reproducibility", "action": null},
    {"id": "ME4", "frequency": "monthly", "description": "Artifacts", "tolerance": "Reproducibility", "action": null},
    {"id": "ME5", "frequency": "monthly", "description": "Spatial distortion", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ME6", "frequency": "monthly", "description": "Monitor controls", "tolerance": "Reproducibility", "action": null},
    {"id": "ME7", "frequency": "monthly", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "AE1", "frequency": "annual", "description": "Positioning perpendicular to imaging plane", "tolerance": "5 mm", "action": "10 mm"},
    {"id": "AE2", "frequency": "annual", "description": "Contrast and Spatial resolution", "tolerance": "Reproducibility", "action": null},
    {"id": "AE3", "frequency": "annual", "description": "Noise", "tolerance": "Reproducibility", "action": null},
    {"id": "AE4", "frequency": "annual", "description": "On screen measurement tools", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "AE5", "frequency": "annual", "description": "Set-up verification tools", "tolerance": "0.5 mm, 0.5°", "action": "1 mm, 1°"},
    {"id": "AE6", "frequency": "annual", "description": "MV Isocentre and panel alignment", "tolerance": "Manufacturer spec", "action": null},
    {"id": "AE7", "frequency": "annual", "description": "Independent QC review", "tolerance": "Complete", "action": null},
    {"id": "EP1", "frequency": "quarterly", "description": "Fluence map reproduction and uniformity (dosimetry)", "tolerance": "2%/2 mm", "action": "3%/3 mm"},
    {"id": "EP2", "frequency": "as_needed", "description": "Calibration (dosimetry)", "tolerance": "1%", "action": "2%"}
  ]
}
```

### Table 23: IMRT/VMAT

```json
{
  "equipment_type": "imrt_vmat",
  "tests": [
    {"id": "CVM1", "frequency": "commissioning", "description": "Isocentre calibration", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "CVM2", "frequency": "commissioning", "description": "Leaf position transfer", "tolerance": "Correct", "action": "1 mm"},
    {"id": "CVM3", "frequency": "commissioning", "description": "MU transfer", "tolerance": "Correct", "action": "0.1 MU"},
    {"id": "CVM4", "frequency": "commissioning", "description": "Diaphragm transfer", "tolerance": "Correct", "action": "1 mm"},
    {"id": "CVM5", "frequency": "commissioning", "description": "Gantry, collimator and couch transfer", "tolerance": "Correct", "action": "1°"},
    {"id": "CVM6", "frequency": "commissioning", "description": "Interleaf transmission", "tolerance": "2%", "action": "3%"},
    {"id": "CVM7", "frequency": "commissioning", "description": "Arc Dosimetry", "tolerance": "2%", "action": "3%"},
    {"id": "CVM8", "frequency": "commissioning", "description": "Picket fence at various gantry angles", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "CVM9", "frequency": "commissioning", "description": "Picket fence during arc delivery", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "CVM10", "frequency": "commissioning", "description": "Gantry speed verification", "tolerance": "2%", "action": "3%"},
    {"id": "CVM11", "frequency": "commissioning", "description": "Dose rate verification", "tolerance": "2%", "action": "3%"},
    {"id": "CVM12", "frequency": "commissioning", "description": "Beam flatness and symmetry during arcing", "tolerance": "3%", "action": "4%"},
    {"id": "CVM13", "frequency": "commissioning", "description": "Beam flatness/symmetry at lower dose rate", "tolerance": "3%", "action": "4%"},
    {"id": "CVM14", "frequency": "commissioning", "description": "Interrupt test", "tolerance": "2%/2 mm", "action": "3%/3 mm"},
    {"id": "CVM15", "frequency": "commissioning", "description": "Composite relative dose reproduction", "tolerance": "3%/3 mm", "action": "4%/4 mm"},
    {"id": "CVM16", "frequency": "commissioning", "description": "Composite absolute dose reproduction", "tolerance": "3%/3 mm", "action": "4%/4 mm"}
  ]
}
```

### Table 24: Medical Linear Accelerators (Linacs)

```json
{
  "equipment_type": "linac",
  "tests": [
    {"id": "DL1", "frequency": "daily", "description": "Door interlock/last person out", "tolerance": "Functional", "action": null},
    {"id": "DL2", "frequency": "daily", "description": "Beam status indicators", "tolerance": "Functional", "action": null},
    {"id": "DL3", "frequency": "daily", "description": "Patient audio-visual monitors", "tolerance": "Functional", "action": null},
    {"id": "DL4", "frequency": "daily", "description": "Motion interlock", "tolerance": "Functional", "action": null},
    {"id": "DL5", "frequency": "daily", "description": "Couch brakes", "tolerance": "Functional", "action": null},
    {"id": "DL6", "frequency": "daily", "description": "Room radiation monitors (where available)", "tolerance": "Functional", "action": null},
    {"id": "DL7", "frequency": "daily", "description": "Beam interrupt/counters", "tolerance": "Functional", "action": null},
    {"id": "DL8", "frequency": "daily", "description": "Output constancy – photons", "tolerance": "2.00%", "action": "3.00%"},
    {"id": "DL9", "frequency": "daily", "description": "Output constancy – electrons", "tolerance": "2.00%", "action": "3.00%"},
    {"id": "ML1", "frequency": "monthly", "description": "Emergency off (alternate monthly)", "tolerance": "Functional", "action": null},
    {"id": "ML2", "frequency": "monthly", "description": "Lasers/crosswires", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML3", "frequency": "monthly", "description": "Optical distance indicator", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML4", "frequency": "monthly", "description": "Field size indicator", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML5", "frequency": "monthly", "description": "Wedge factors (dynamic or virtual)", "tolerance": "1.00%", "action": "2.00%"},
    {"id": "ML6", "frequency": "monthly", "description": "Gantry angle readouts", "tolerance": "0.5°", "action": "1°"},
    {"id": "ML7", "frequency": "monthly", "description": "Collimator angle readouts", "tolerance": "0.5°", "action": "1°"},
    {"id": "ML8", "frequency": "monthly", "description": "Couch position readouts", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML9", "frequency": "monthly", "description": "Couch isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML10", "frequency": "monthly", "description": "Couch angle", "tolerance": "0.5°", "action": "1°"},
    {"id": "ML11", "frequency": "monthly", "description": "Collimator rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML12", "frequency": "monthly", "description": "Light/radiation field coincidence", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML13", "frequency": "monthly", "description": "Beam flatness constancy", "tolerance": "1%", "action": "2%"},
    {"id": "ML14", "frequency": "monthly", "description": "Beam symmetry constancy", "tolerance": "1%", "action": "2%"},
    {"id": "ML15", "frequency": "monthly", "description": "Relative dosimetry constancy", "tolerance": "1%", "action": "2%"},
    {"id": "ML16", "frequency": "monthly", "description": "Accuracy of QA records", "tolerance": "Complete", "action": null},
    {"id": "QL1", "frequency": "quarterly", "description": "Central axis depth dose reproducibility", "tolerance": "1%/2mm", "action": "2%/3mm"},
    {"id": "AL1", "frequency": "annual", "description": "Accessory mechanical integrity", "tolerance": "Safe", "action": null},
    {"id": "AL2", "frequency": "annual", "description": "Accessory interlocks", "tolerance": "Functional", "action": null},
    {"id": "AL3", "frequency": "annual", "description": "ODI at extended distances", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL4", "frequency": "annual", "description": "Light/rad coincidence vs gantry", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL5", "frequency": "annual", "description": "Field size vs gantry angle", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL6", "frequency": "annual", "description": "TRS-398 calibration", "tolerance": "1%", "action": "2%"},
    {"id": "AL7", "frequency": "annual", "description": "Output factors", "tolerance": "1%", "action": "2%"},
    {"id": "AL8", "frequency": "annual", "description": "Wedge transmission and profiles", "tolerance": "1%", "action": "2%"},
    {"id": "AL9", "frequency": "annual", "description": "Accessory transmission factors", "tolerance": "1%", "action": "2%"},
    {"id": "AL10", "frequency": "annual", "description": "Output vs gantry angle", "tolerance": "1%", "action": "2%"},
    {"id": "AL11", "frequency": "annual", "description": "Symmetry vs gantry angle", "tolerance": "1%", "action": "2%"},
    {"id": "AL12", "frequency": "annual", "description": "Monitor unit linearity", "tolerance": "1%", "action": "2%"},
    {"id": "AL13", "frequency": "annual", "description": "Monitor unit end effect", "tolerance": "< 1 MU", "action": "< 2 MU"},
    {"id": "AL14", "frequency": "annual", "description": "Collimator rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL15", "frequency": "annual", "description": "Gantry rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL16", "frequency": "annual", "description": "Couch rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL17", "frequency": "annual", "description": "Coincidence of axes", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AL18", "frequency": "annual", "description": "Independent review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 25: Multileaf Collimators (MLC)

```json
{
  "equipment_type": "mlc",
  "tests": [
    {"id": "MM1", "frequency": "monthly", "description": "Light and radiation field coincidence", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MM2", "frequency": "monthly", "description": "Leaf positions for standard field template", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "AM1", "frequency": "annual", "description": "Leaf transmission (all energies)", "tolerance": "Reproducibility", "action": null},
    {"id": "AM2", "frequency": "annual", "description": "Leakage between leaves (all energies)", "tolerance": "Reproducibility", "action": null},
    {"id": "AM3", "frequency": "annual", "description": "Transmission through abutting leaves", "tolerance": "Reproducibility", "action": null},
    {"id": "AM4", "frequency": "annual", "description": "Stability with gantry rotation", "tolerance": "Reproducibility", "action": null},
    {"id": "AM5", "frequency": "annual", "description": "Alignment with jaws", "tolerance": null, "action": "1°/1 mm"},
    {"id": "AM6", "frequency": "annual", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "AM7", "frequency": "annual", "description": "Independent quality control review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 28: Record and Verify Systems

```json
{
  "equipment_type": "record_verify",
  "tests": [
    {"id": "CRV1", "frequency": "commissioning", "description": "Enter site details, assign user rights", "tolerance": "Documented", "action": null},
    {"id": "CRV2", "frequency": "commissioning", "description": "Verification of treatment parameters", "tolerance": "Correct", "action": null},
    {"id": "CRV3", "frequency": "commissioning", "description": "Light field tests", "tolerance": "Correct", "action": null},
    {"id": "CRV4", "frequency": "commissioning", "description": "Imaging System", "tolerance": "Correct", "action": null},
    {"id": "IPRV1", "frequency": "patient_specific", "description": "Verification of treatment parameters", "tolerance": "Correct", "action": null},
    {"id": "IPRV2", "frequency": "patient_specific", "description": "Verification of dose recording", "tolerance": "Correct", "action": null},
    {"id": "WRV1", "frequency": "weekly", "description": "Back-ups", "tolerance": "Successful", "action": null}
  ]
}
```

### Table 29: Conventional Radiotherapy Simulators

```json
{
  "equipment_type": "conventional_simulator",
  "tests": [
    {"id": "DS1", "frequency": "daily", "description": "Door interlock", "tolerance": "Functional", "action": null},
    {"id": "DS2", "frequency": "daily", "description": "Beam status indicators", "tolerance": "Functional", "action": null},
    {"id": "DS3", "frequency": "daily", "description": "Lasers/cross-wires", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "DS4", "frequency": "daily", "description": "Optical distance indicator", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "DS5", "frequency": "daily", "description": "Cross-wires/Reticle/Block tray", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "DS6", "frequency": "daily", "description": "Field size indicators", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS1", "frequency": "monthly", "description": "Motion interlock", "tolerance": "Functional", "action": null},
    {"id": "MS2", "frequency": "monthly", "description": "Emergency off buttons", "tolerance": "Functional", "action": null},
    {"id": "MS3", "frequency": "monthly", "description": "Collision avoidance", "tolerance": "Functional", "action": null},
    {"id": "MS4", "frequency": "monthly", "description": "Gantry angle readouts", "tolerance": "0.5°", "action": "1°"},
    {"id": "MS5", "frequency": "monthly", "description": "Collimator angle readouts", "tolerance": "0.5°", "action": "1°"},
    {"id": "MS6", "frequency": "monthly", "description": "Couch position readouts", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS7", "frequency": "monthly", "description": "Alignment of FAD movement", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS8", "frequency": "monthly", "description": "Couch isocentre", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "MS9", "frequency": "monthly", "description": "Couch parallelism", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS10", "frequency": "monthly", "description": "Couch angle", "tolerance": "0.5°", "action": "1°"},
    {"id": "MS11", "frequency": "monthly", "description": "Laser/crosswire isocentricity", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS12", "frequency": "monthly", "description": "Optical distance indicator", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS13", "frequency": "monthly", "description": "Crosswire centring", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS14", "frequency": "monthly", "description": "Light/radiation coincidence", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "MS15", "frequency": "monthly", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "AS1", "frequency": "annual", "description": "Independent QC review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 30: Gamma Knife Units

```json
{
  "equipment_type": "gamma_knife",
  "tests": [
    {"id": "DSG1", "frequency": "daily", "description": "Door interlock/radiation on lights", "tolerance": "Functional", "action": null},
    {"id": "DSG2", "frequency": "daily", "description": "Audio and visual contact with patient", "tolerance": "Functional", "action": null},
    {"id": "DSG3", "frequency": "daily", "description": "System Alarm test", "tolerance": "Functional", "action": null},
    {"id": "DSG4", "frequency": "daily", "description": "Machine interlocks (protection bars, docking)", "tolerance": "Functional", "action": null},
    {"id": "DSG5", "frequency": "daily", "description": "Frame/Mask adaptor docking and angle interlock", "tolerance": "Functional", "action": null},
    {"id": "DSG6", "frequency": "daily", "description": "Treatment initiate/timer terminate", "tolerance": "Functional", "action": null},
    {"id": "DSG7", "frequency": "daily", "description": "System status indicator on console", "tolerance": "Functional", "action": null},
    {"id": "DSG8", "frequency": "daily", "description": "Treatment pause and resume", "tolerance": "Functional", "action": null},
    {"id": "DSG9", "frequency": "daily", "description": "Imaging Quality Assessment", "tolerance": "Variable", "action": null},
    {"id": "DSG10", "frequency": "daily", "description": "Dose rate on specified date", "tolerance": "Correct", "action": null},
    {"id": "DSG11", "frequency": "daily", "description": "TPS Treatment time Calculation (Independent check)", "tolerance": "3%", "action": "5%"},
    {"id": "DSG12", "frequency": "daily", "description": "Focus Precision Test", "tolerance": "≤ 0.4 mm (Radial)", "action": null},
    {"id": "DSG13", "frequency": "daily", "description": "CBCT Precision", "tolerance": "≤ 0.4 mm", "action": null},
    {"id": "DSG14", "frequency": "daily", "description": "HDMM system check", "tolerance": "Functional", "action": null},
    {"id": "DSG15", "frequency": "daily", "description": "Emergency Procedure Posted", "tolerance": "Functional", "action": null},
    {"id": "DSG16", "frequency": "daily", "description": "Radiation Survey meter Available", "tolerance": "Functional", "action": null},
    {"id": "DSG17", "frequency": "daily", "description": "Relative Output Factors (ROFs)", "tolerance": "Correct", "action": null},
    {"id": "MSG1", "frequency": "monthly", "description": "Extended alarm test", "tolerance": "Functional", "action": null},
    {"id": "MSG2", "frequency": "monthly", "description": "UPS battery check", "tolerance": "Functional", "action": null},
    {"id": "MSG3", "frequency": "monthly", "description": "Timer linearity", "tolerance": "1%", "action": "2%"},
    {"id": "MSG4", "frequency": "monthly", "description": "Timer constancy", "tolerance": "1%", "action": "3%"},
    {"id": "MSG5", "frequency": "monthly", "description": "Shutter correction/Timer Error", "tolerance": "0.01 min", "action": "0.02 min"},
    {"id": "MSG6", "frequency": "monthly", "description": "Timer accuracy", "tolerance": "0.1%", "action": "0.2%"},
    {"id": "MSG7", "frequency": "monthly", "description": "Radiation output (Dose rate)", "tolerance": "1.5%", "action": "2%"},
    {"id": "MSG8", "frequency": "monthly", "description": "Thermometer, barometer, ion chamber QA", "tolerance": "SASQART standards", "action": null},
    {"id": "MSG9", "frequency": "monthly", "description": "Emergency stop and reset", "tolerance": "Functional", "action": null},
    {"id": "MSG10", "frequency": "monthly", "description": "Couch out (emergency release)", "tolerance": "Functional", "action": null},
    {"id": "MSG11", "frequency": "monthly", "description": "Clearance test tool check", "tolerance": "Functional", "action": null},
    {"id": "MSG12", "frequency": "monthly", "description": "CBCT Image quality", "tolerance": "Specified values", "action": null},
    {"id": "MSG13", "frequency": "monthly", "description": "Documentation", "tolerance": "Complete", "action": null},
    {"id": "ASG1", "frequency": "annual", "description": "Acceptance functional tests", "tolerance": "Functional", "action": null},
    {"id": "ASG2", "frequency": "annual", "description": "Calibration – IAEA TRS 398 and 483", "tolerance": "1%", "action": "2%"},
    {"id": "ASG3", "frequency": "annual", "description": "Dose profiles", "tolerance": "1 mm at 50%", "action": null},
    {"id": "ASG4", "frequency": "annual", "description": "Relative Output Factors", "tolerance": "5%", "action": "7%"},
    {"id": "ASG5", "frequency": "annual", "description": "Radiation/mechanical isocentre coincidence", "tolerance": "0.5 mm", "action": null},
    {"id": "ASG6", "frequency": "annual", "description": "End-to-end test", "tolerance": "±5%/≤1.5 mm DTA", "action": "≤3 mm"},
    {"id": "ASG7", "frequency": "annual", "description": "CBCT dosimetry", "tolerance": "±35% from nominal", "action": null},
    {"id": "ASG8", "frequency": "annual", "description": "Transit dose", "tolerance": "3 cGy/shot", "action": null},
    {"id": "ASG9", "frequency": "annual", "description": "Independent Quality Control Review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 31: Linac-based SRS/SRT

```json
{
  "equipment_type": "linac_srs",
  "tests": [
    {"id": "DSL1", "frequency": "daily", "description": "Patient monitoring system", "tolerance": "Functional", "action": null},
    {"id": "DSL2", "frequency": "daily", "description": "SRS/SRT-specific machine interlocks", "tolerance": "Functional", "action": null},
    {"id": "DSL3", "frequency": "daily", "description": "IGRT matching and positioning accuracy", "tolerance": "1 mm", "action": "1 mm"},
    {"id": "DSL4", "frequency": "daily", "description": "Laser and optical isocentre alignment", "tolerance": "1 mm", "action": "1 mm"},
    {"id": "PSL1", "frequency": "patient_specific", "description": "Collision/clearance tests", "tolerance": "Functional", "action": null},
    {"id": "PSL2", "frequency": "patient_specific", "description": "Reference imaging and calculation parameter check", "tolerance": "Appropriate", "action": null},
    {"id": "PSL3", "frequency": "patient_specific", "description": "Measurement/Independent MU calculation", "tolerance": "3%/1 mm", "action": "5%/1.5 mm"},
    {"id": "PSL4", "frequency": "patient_specific", "description": "Couch/Pedestal Locking", "tolerance": "Functional", "action": null},
    {"id": "PSL5", "frequency": "patient_specific", "description": "Field collimating device alignment", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "PSL6", "frequency": "patient_specific", "description": "Field shape check", "tolerance": "Correct", "action": null},
    {"id": "PSL7", "frequency": "patient_specific", "description": "Head Frame motion", "tolerance": "1 mm", "action": "1 mm"},
    {"id": "PSL8", "frequency": "patient_specific", "description": "Gantry, couch, collimator radiation isocentre wobble", "tolerance": "0.7 mm", "action": "1 mm"},
    {"id": "PSL9", "frequency": "patient_specific", "description": "Average MV isocentre and IGRT axis coincidence", "tolerance": "0.5 mm", "action": "1 mm"},
    {"id": "PSL10", "frequency": "patient_specific", "description": "Checklist/Records", "tolerance": "Complete", "action": null},
    {"id": "ASL1", "frequency": "annual", "description": "Acceptance functional tests", "tolerance": "Functional", "action": null},
    {"id": "ASL2", "frequency": "annual", "description": "Percentage depth dose", "tolerance": "1%", "action": "2%"},
    {"id": "ASL3", "frequency": "annual", "description": "Dose profiles (FWHM)", "tolerance": "1 mm", "action": "1 mm"},
    {"id": "ASL4", "frequency": "annual", "description": "Output factors", "tolerance": "2%", "action": "3%"},
    {"id": "ASL5", "frequency": "annual", "description": "Gantry, couch, collimator radiation isocentre wobble", "tolerance": "0.7 mm", "action": "1.0 mm"},
    {"id": "ASL6", "frequency": "annual", "description": "Gantry, couch, collimator radiation, laser and IGRT isocentre coincidence", "tolerance": "0.5 mm", "action": "1.0 mm"},
    {"id": "ASL7", "frequency": "annual", "description": "End-to-end test", "tolerance": "3%/1 mm", "action": "5%/1.5 mm"},
    {"id": "ASL8", "frequency": "annual", "description": "CT localisation performance", "tolerance": "0.5 mm", "action": "1.0 mm"},
    {"id": "ASL9", "frequency": "annual", "description": "MRI localisation performance", "tolerance": "1.0 mm", "action": "2.0 mm"},
    {"id": "ASL10", "frequency": "annual", "description": "Angiography localisation performance", "tolerance": "1 mm", "action": "1 mm"}
  ]
}
```

### Table 32: Treatment Planning Systems

```json
{
  "equipment_type": "tps",
  "tests": [
    {"id": "PTPS1", "frequency": "patient_specific", "description": "Patient-related data", "tolerance": "Data verified", "action": null},
    {"id": "PTPS2", "frequency": "patient_specific", "description": "Beam geometry", "tolerance": "Data verified", "action": null},
    {"id": "PTPS3", "frequency": "patient_specific", "description": "Dose distribution", "tolerance": "Data verified", "action": null},
    {"id": "PTPS4", "frequency": "patient_specific", "description": "MU/time per beam", "tolerance": "2 MU/2%", "action": "3 MU/3%"},
    {"id": "PTPS5", "frequency": "patient_specific", "description": "Plan data transfer", "tolerance": "Data verified", "action": null},
    {"id": "WTPS1", "frequency": "weekly", "description": "Back-ups", "tolerance": "Successful", "action": null},
    {"id": "QTPS1", "frequency": "quarterly", "description": "Digitiser (if used clinically)", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "QTPS2", "frequency": "quarterly", "description": "Electronic plan transfer", "tolerance": "Data verified", "action": null},
    {"id": "QTPS3", "frequency": "quarterly", "description": "Plan details", "tolerance": "Data verified", "action": null},
    {"id": "QTPS4", "frequency": "quarterly", "description": "Plotter/Printer (if used clinically)", "tolerance": "2 mm", "action": "3 mm"},
    {"id": "STPS1", "frequency": "biannual", "description": "CT geometry/density", "tolerance": "2 mm/0.02 RED", "action": "3 mm/0.03 RED"},
    {"id": "ATPS1", "frequency": "annual", "description": "Revalidation", "tolerance": "2%", "action": "3%"},
    {"id": "UTPS1", "frequency": "commissioning", "description": "End-to-end", "tolerance": "2%", "action": "3%"},
    {"id": "CTPS1", "frequency": "commissioning", "description": "Independent quality control review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 34: Bore-based Linacs (Halcyon, TomoTherapy, MR-Linac)

```json
{
  "equipment_type": "bore_linac",
  "tests": [
    {"id": "DL1", "frequency": "daily", "description": "Door interlock/last person out", "tolerance": "Functional", "action": null},
    {"id": "DL2", "frequency": "daily", "description": "Beam status indicators", "tolerance": "Functional", "action": null},
    {"id": "DL3", "frequency": "daily", "description": "Patient audio-visual monitors", "tolerance": "Functional", "action": null},
    {"id": "DL4", "frequency": "daily", "description": "Motion interlock", "tolerance": "Functional", "action": null},
    {"id": "DL5", "frequency": "daily", "description": "Couch brakes", "tolerance": "Functional", "action": null},
    {"id": "DL6", "frequency": "daily", "description": "Room radiation monitors (where available)", "tolerance": "Functional", "action": null},
    {"id": "DL7", "frequency": "daily", "description": "Beam interrupt/counters", "tolerance": "Functional", "action": null},
    {"id": "DL8", "frequency": "daily", "description": "Output constancy – photons", "tolerance": "2.00%", "action": "3.00%"},
    {"id": "DL9", "frequency": "daily", "description": "Imaging and treatment isocentre coincidence", "tolerance": "< 1 mm", "action": "< 2 mm"},
    {"id": "DL10", "frequency": "daily", "description": "Collision interlock – bore", "tolerance": "Functional", "action": null},
    {"id": "ML1", "frequency": "monthly", "description": "Lasers and isocentre coincidence", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML2", "frequency": "monthly", "description": "Couch position readouts", "tolerance": "1 mm", "action": "2 mm"},
    {"id": "ML3", "frequency": "monthly", "description": "Beam (un)flatness/off-axis-intensity", "tolerance": "Manufacturer spec", "action": null},
    {"id": "ML4", "frequency": "monthly", "description": "Beam symmetry", "tolerance": "2.00%", "action": "3.00%"},
    {"id": "ML5", "frequency": "monthly", "description": "Reference dosimetry – TRS398", "tolerance": "1.00%", "action": "2.00%"},
    {"id": "ML6", "frequency": "monthly", "description": "MLC (if applicable)", "tolerance": "See MLC table", "action": null},
    {"id": "ML7", "frequency": "monthly", "description": "MV and kV planar imaging (if applicable)", "tolerance": "See IGRT table", "action": null},
    {"id": "ML8", "frequency": "monthly", "description": "CBCT (if applicable)", "tolerance": "See IGRT table", "action": null},
    {"id": "ML9", "frequency": "monthly", "description": "Records", "tolerance": "Complete", "action": null},
    {"id": "QL1", "frequency": "quarterly", "description": "Emergency off buttons (alternate)", "tolerance": "Functional", "action": null},
    {"id": "QL2", "frequency": "quarterly", "description": "Beam quality verification", "tolerance": "Baseline", "action": null},
    {"id": "AL1", "frequency": "annual", "description": "Absolute calibration TRS-398", "tolerance": "1%", "action": "2%"},
    {"id": "AL2", "frequency": "annual", "description": "Output factors", "tolerance": "1%", "action": "2%"},
    {"id": "AL3", "frequency": "annual", "description": "Independent QC review", "tolerance": "Complete", "action": null}
  ]
}
```

### Table 26: Radiation Protection

```json
{
  "equipment_type": "radiation_protection",
  "tests": [
    {"id": "DRP1", "frequency": "daily", "description": "Room area monitor (where required)", "tolerance": "Functional", "action": null},
    {"id": "DRP2", "frequency": "daily", "description": "Radiation ON lights", "tolerance": "Functional", "action": null},
    {"id": "WRP1", "frequency": "weekly", "description": "Pregnant personnel monitored with direct read dosimeter", "tolerance": "DoH Licensing Limits", "action": null},
    {"id": "MRP1", "frequency": "monthly", "description": "Radiation worker monitoring", "tolerance": "DoH Licensing Limits", "action": null},
    {"id": "ARP1", "frequency": "annual", "description": "Lead apron (where required) intact", "tolerance": "Physical", "action": null},
    {"id": "ARP2", "frequency": "annual", "description": "Lead apron (where required) image", "tolerance": "X Ray", "action": null},
    {"id": "ARP3", "frequency": "annual", "description": "Wipe test of all sealed radionuclides", "tolerance": "Background", "action": null},
    {"id": "ARP4", "frequency": "annual", "description": "Documentation", "tolerance": "Complete", "action": null},
    {"id": "BRP1", "frequency": "biennial", "description": "Room area monitor calibration verification", "tolerance": "Performed", "action": null},
    {"id": "BRP2", "frequency": "biennial", "description": "Survey meter calibration", "tolerance": "Performed", "action": null},
    {"id": "BRP3", "frequency": "biennial", "description": "Electronic Personal Dosimeter", "tolerance": "Performed", "action": null}
  ]
}
```

---

## UI/UX Requirements

1. **Mobile-first responsive design** - therapists use tablets
2. **Quick entry** - minimize taps for daily QA
3. **Color-coded status** - green pass, red fail, yellow warning
4. **Equipment selector** with energy dropdown
5. **Dashboard** showing QA due status per unit
6. **Trend charts** with tolerance bands
7. **PDF export** with hospital branding
8. **Offline capability** (nice to have for future)

---

## File Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (dashboard)
│   │   ├── qa/
│   │   │   ├── [equipmentType]/
│   │   │   │   └── [frequency]/page.tsx
│   │   ├── equipment/
│   │   │   └── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx
│   │   ├── trends/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── users/page.tsx
│   │       ├── audit/page.tsx
│   │       └── organization/page.tsx
│   └── api/
│       └── ... (if needed)
├── components/
│   ├── ui/ (shadcn components)
│   ├── qa-form.tsx
│   ├── equipment-selector.tsx
│   ├── status-badge.tsx
│   └── trend-chart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── tests.ts (SASQART test definitions)
│   └── utils.ts
└── supabase/
    ├── migrations/
    └── seed.sql
```

---

## Getting Started Instructions

1. Create new Next.js project:
```bash
npx create-next-app@latest sasqart-qa --typescript --tailwind --app
cd sasqart-qa
```

2. Install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install recharts date-fns
npm install @react-pdf/renderer  # for PDF generation
npx shadcn@latest init
```

3. Set up Supabase:
- Create project at supabase.com
- Run the SQL schema above
- Add seed data for SASQART tests
- Configure Row Level Security

4. Environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Build the app following the structure above

---

## Priority Order

1. **Auth + multi-tenant setup** (Supabase RLS)
2. **Equipment management** 
3. **Linac daily/monthly QA** (most common)
4. **Dashboard with due status**
5. **History and report viewing**
6. **PDF export**
7. **Output trends**
8. **Other equipment types**
9. **SAHPRA export package**
10. **Billing integration (Stripe/PayFast)**

---

## Notes

- All test definitions above are from SASQART Practice Guidelines 2024
- Frequency codes: daily, weekly, monthly, quarterly, biannual, annual, biennial, patient_specific, commissioning
- Some tests are equipment-specific (e.g., FFF beams only for capable linacs)
- RLS ensures complete data isolation between organizations
- Audit log captures all significant actions for compliance
