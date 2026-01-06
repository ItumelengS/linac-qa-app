export type EquipmentType =
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
  | "radiation_protection";

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
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

// Equipment type display names
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
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
