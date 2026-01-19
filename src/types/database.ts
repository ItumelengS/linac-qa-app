export type EquipmentType =
  // Radiation Therapy
  | "linac"
  | "bore_linac"
  | "linac_srs"
  | "cobalt60"
  | "ct_simulator"
  | "conventional_simulator"
  | "tps"
  | "brachytherapy_hdr"
  | "brachytherapy_ldr"
  | "kilovoltage"
  | "kilovoltage_intraop"
  | "gamma_knife"
  | "mlc"
  | "epid"
  | "record_verify"
  | "imrt_vmat"
  | "radiation_protection"
  // Nuclear Medicine
  | "gamma_camera"
  | "spect"
  | "spect_ct"
  | "pet"
  | "pet_ct"
  | "pet_mri"
  | "dose_calibrator"
  | "thyroid_uptake"
  // Diagnostic Radiology
  | "xray_general"
  | "fluoroscopy"
  | "mammography"
  | "ct_diagnostic"
  | "mri"
  | "dental_xray"
  | "c_arm"
  | "dexa"
  | "angiography";

export type InstrumentType =
  | "ion_chamber"
  | "electrometer"
  | "thermometer"
  | "barometer"
  | "hygrometer"
  | "survey_meter"
  | "well_chamber"
  | "diode"
  | "film"
  | "mosfet"
  | "diamond_detector"
  | "scintillator"
  | "phantom"
  | "other";

export type QAFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "biannual"
  | "annual"
  | "biennial"
  | "patient_specific"
  | "commissioning"
  | "as_needed";

export type UserRole = "admin" | "physicist" | "therapist";

export type QAStatus = "pass" | "fail" | "na" | "";

export type CalculatorType =
  | "position_deviation"      // Expected vs Measured position (mm)
  | "percentage_difference"   // Reference vs Measured (%)
  | "dwell_time"              // Set time vs Measured time (%)
  | "timer_linearity"         // Multiple time points, max deviation
  | "transit_reproducibility" // Multiple readings, mean + variation
  | "source_decay_check"      // Source decay verification
  | "srak_calculation";       // Source Reference Air Kerma Rate (HDR brachytherapy)

export type ReportStatus = "draft" | "submitted" | "reviewed" | "approved" | "rejected";

export type OverallResult = "pass" | "fail" | "conditional";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  subscription_tier: "free" | "basic" | "professional" | "enterprise";
  subscription_status: "active" | "trial" | "suspended" | "cancelled";
  max_equipment: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id?: string;
  full_name: string;
  email: string;
  role: UserRole;
  hpcsa_number?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organizations?: Organization;
}

export interface Equipment {
  id: string;
  organization_id: string;
  equipment_type: EquipmentType;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  room_number?: string;
  install_date?: string;
  last_service_date?: string;
  next_service_date?: string;
  active: boolean;
  photon_energies: string[];
  electron_energies: string[];
  fff_energies: string[];
  source_type?: string;
  source_strength?: number;
  source_calibration_date?: string;
  tube_serial?: string;
  detector_heads?: number; // Number of detector heads for gamma cameras/SPECT (typically 1, 2, or 3)
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Instrument {
  id: string;
  organization_id: string;
  instrument_type: InstrumentType;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  vendor?: string;
  calibration_certificate?: string;
  calibration_date?: string;
  calibration_expiry_date?: string;
  calibration_lab?: string;
  calibration_factor?: number;
  calibration_factor_unit?: string;
  electrometer_correction?: number;
  polarity_correction?: number;
  recombination_correction?: number;
  active: boolean;
  location?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface QATestDefinition {
  id: string;
  equipment_type: EquipmentType;
  test_id: string;
  frequency: QAFrequency;
  description: string;
  tolerance?: string;
  action_level?: string;
  category?: string;
  requires_measurement: boolean;
  measurement_unit?: string;
  calculator_type?: CalculatorType;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface QAReport {
  id: string;
  organization_id: string;
  equipment_id: string;
  qa_type: QAFrequency;
  date: string;
  performer_id?: string;
  performer_name: string;
  witness_id?: string;
  witness_name?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  status: ReportStatus;
  overall_result?: OverallResult;
  comments?: string;
  corrective_actions?: string;
  signature?: string;
  energy?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  equipment?: Equipment;
  performer?: Profile;
}

export interface QATest {
  id: string;
  report_id: string;
  test_id: string;
  status?: QAStatus;
  measurement?: number;
  measurement_unit?: string;
  baseline_value?: number;
  deviation?: number;
  notes?: string;
  created_at: string;
}

export interface OutputReading {
  id: string;
  organization_id: string;
  equipment_id: string;
  report_id?: string;
  date: string;
  energy: string;
  reading: number;
  reference_value: number;
  deviation: number;
  temperature?: number;
  pressure?: number;
  humidity?: number;
  field_size: string;
  depth: string;
  ssd: string;
  chamber_id?: string;
  electrometer_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface AuditLog {
  id: string;
  organization_id?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by?: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

// Baseline value types for each calculator
export interface SourceDecayBaseline {
  initial_activity: number;
  calibration_date: string;
  unit?: string; // Ci, mCi, GBq, TBq
  min_usable_activity?: number;
}

// HDR Brachytherapy SRAK calculation baseline
export interface SRAKBaseline {
  chamber_factor_nsk: number;      // μGy·m²·h⁻¹·nA⁻¹
  electrometer_factor: number;     // typically 1.000
  reference_temperature: number;   // typically 20°C
  reference_pressure: number;      // typically 101.325 kPa
  certificate_srak: number;        // μGy·m²·h⁻¹ at calibration
  certificate_date: string;        // ISO date string
  sweet_spot_position?: number;    // mm - position of max response in well chamber
}

export interface PositionDeviationBaseline {
  expected_position: number;
}

export interface DwellTimeBaseline {
  set_time: number;
}

export interface PercentageDifferenceBaseline {
  reference_value: number;
}

export interface TimerLinearityBaseline {
  time_points: number[]; // e.g., [10, 30, 60, 120]
}

// Linac-specific baselines
export interface OutputConstancyBaseline {
  reference_output: number; // cGy/MU or reading value
  measurement_date: string;
  field_size?: string; // e.g., "10x10"
  depth?: string; // e.g., "dmax" or "10cm"
  ssd?: string; // e.g., "100cm"
}

export interface EnergyBaselinesMap {
  [energy: string]: OutputConstancyBaseline; // keyed by energy like "6MV", "10MV", "6MeV"
}

export interface BeamSymmetryBaseline {
  reference_flatness?: number; // percentage
  reference_symmetry?: number; // percentage
}

// Cobalt-60 specific (similar to brachytherapy but with different parameters)
export interface Cobalt60SourceBaseline {
  initial_activity: number;
  calibration_date: string;
  unit: string; // typically Ci or TBq
  half_life_days?: number; // 1925.2 days for Co-60
}

// CT Simulator baselines
export interface CTHounsfieldBaseline {
  water_hu: number; // should be ~0
  air_hu: number; // should be ~-1000
  noise_std: number; // standard deviation for water
  uniformity_tolerance: number; // HU difference center vs periphery
}

// CT Simulator dosimetry baselines (for biennial tests)
export interface CTDosimetryBaseline {
  ctdi_vol_reference: number; // Reference CTDIvol in mGy
  ctdi_vol_4dct_reference?: number; // Reference CTDIvol for 4D-CT in mGy
}

// Gamma Knife baselines
export interface GammaKnifeDoseRateBaseline {
  dose_rate: number; // Gy/min
  measurement_date: string;
  collimator_size?: string; // e.g., "16mm", "8mm", "4mm"
}

export interface GammaKnifeOutputFactorBaseline {
  output_factors: {
    [collimator: string]: number; // e.g., {"16mm": 1.0, "8mm": 0.95, "4mm": 0.87}
  };
}

// Kilovoltage baselines
export interface KilovoltageOutputBaseline {
  reference_output: number;
  kvp: number;
  ma: number;
  cone_size?: string;
  filter?: string;
  measurement_date: string;
}

// MLC baselines
export interface MLCBaseline {
  leaf_transmission: number; // percentage
  interleaf_leakage: number; // percentage
  abutting_leaf_transmission?: number;
}

// Annual Linac baselines
export interface TRS398CalibrationBaseline {
  reference_dose_rate: number; // cGy/MU at reference conditions
  measurement_date: string;
  protocol_conditions?: string; // e.g., "10x10, 10cm depth, SSD 100cm"
}

export interface OutputFactorsBaseline {
  field_sizes: {
    [fieldSize: string]: number; // e.g., {"4x4": 0.92, "6x6": 0.95, "10x10": 1.0, "20x20": 1.04}
  };
  reference_field: string; // e.g., "10x10"
}

export interface WedgeTransmissionBaseline {
  wedge_factors: {
    [wedgeAngle: string]: number; // e.g., {"15": 0.75, "30": 0.55, "45": 0.42, "60": 0.30}
  };
}

export interface AccessoryTransmissionBaseline {
  accessory_factors: {
    [accessory: string]: number; // e.g., {"Tray": 0.97, "Block Tray": 0.95}
  };
}

export interface GantryOutputBaseline {
  reference_output_0deg: number; // Reference output at gantry 0 degrees
  reference_symmetry_0deg?: number; // Reference symmetry at gantry 0 degrees
}

export interface MULinearityBaseline {
  mu_points: number[]; // e.g., [5, 10, 25, 50, 100, 200, 300]
  end_effect?: number; // MU end effect value
}

export type BaselineValues =
  | SourceDecayBaseline
  | SRAKBaseline
  | PositionDeviationBaseline
  | DwellTimeBaseline
  | PercentageDifferenceBaseline
  | TimerLinearityBaseline
  | OutputConstancyBaseline
  | EnergyBaselinesMap
  | BeamSymmetryBaseline
  | Cobalt60SourceBaseline
  | CTHounsfieldBaseline
  | CTDosimetryBaseline
  | GammaKnifeDoseRateBaseline
  | GammaKnifeOutputFactorBaseline
  | KilovoltageOutputBaseline
  | MLCBaseline
  | TRS398CalibrationBaseline
  | OutputFactorsBaseline
  | WedgeTransmissionBaseline
  | AccessoryTransmissionBaseline
  | GantryOutputBaseline
  | MULinearityBaseline
  | Record<string, unknown>;

export interface EquipmentBaseline {
  id: string;
  equipment_id: string;
  test_id: string;
  values: BaselineValues;
  source_serial?: string;  // Serial number of the source this baseline applies to
  is_current: boolean;     // Only one baseline per equipment+test can be current
  valid_from: string;      // When this baseline became active
  valid_until?: string;    // When superseded (null = still current)
  superseded_by?: string;  // ID of the baseline that replaced this one
  notes?: string;
  created_at: string;
  created_by?: string;
}

// Equipment type display names
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  // Radiation Therapy
  linac: "Linear Accelerator",
  bore_linac: "Bore-based Linac (Halcyon/TomoTherapy/MR-Linac)",
  linac_srs: "Linac-based SRS/SRT",
  cobalt60: "Cobalt-60 Teletherapy",
  ct_simulator: "CT Simulator",
  conventional_simulator: "Conventional Simulator",
  tps: "Treatment Planning System",
  brachytherapy_hdr: "Brachytherapy HDR/PDR",
  brachytherapy_ldr: "Brachytherapy LDR",
  kilovoltage: "Kilovoltage X-ray",
  kilovoltage_intraop: "Intraoperative Kilovoltage",
  gamma_knife: "Gamma Knife",
  mlc: "Multileaf Collimator",
  epid: "Portal Imaging (EPID)",
  record_verify: "Record & Verify System",
  imrt_vmat: "IMRT/VMAT",
  radiation_protection: "Radiation Protection",
  // Nuclear Medicine
  gamma_camera: "Gamma Camera (Planar)",
  spect: "SPECT",
  spect_ct: "SPECT/CT",
  pet: "PET",
  pet_ct: "PET/CT",
  pet_mri: "PET/MRI",
  dose_calibrator: "Dose Calibrator",
  thyroid_uptake: "Thyroid Uptake System",
  // Diagnostic Radiology
  xray_general: "General X-ray",
  fluoroscopy: "Fluoroscopy",
  mammography: "Mammography",
  ct_diagnostic: "CT Scanner (Diagnostic)",
  mri: "MRI",
  dental_xray: "Dental X-ray",
  c_arm: "C-Arm",
  dexa: "Bone Densitometer (DEXA)",
  angiography: "Angiography",
};

// Frequency display names
export const FREQUENCY_LABELS: Record<QAFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Biannual",
  annual: "Annual",
  biennial: "Biennial",
  patient_specific: "Patient Specific",
  commissioning: "Commissioning",
  as_needed: "As Needed",
};

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  physicist: "Medical Physicist",
  therapist: "Radiation Therapist",
};

// Instrument type display names
export const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  ion_chamber: "Ion Chamber",
  electrometer: "Electrometer",
  thermometer: "Thermometer",
  barometer: "Barometer",
  hygrometer: "Hygrometer",
  survey_meter: "Survey Meter",
  well_chamber: "Well Chamber",
  diode: "Diode Detector",
  film: "Film Dosimeter",
  mosfet: "MOSFET Detector",
  diamond_detector: "Diamond Detector",
  scintillator: "Scintillator",
  phantom: "Phantom",
  other: "Other",
};
