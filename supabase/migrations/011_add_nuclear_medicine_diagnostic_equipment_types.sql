-- Add Nuclear Medicine and Diagnostic Radiology equipment types

-- Nuclear Medicine
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'gamma_camera';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'spect';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'spect_ct';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'pet';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'pet_ct';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'pet_mri';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'dose_calibrator';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'thyroid_uptake';

-- Diagnostic Radiology
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'xray_general';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'fluoroscopy';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'mammography';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'ct_diagnostic';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'mri';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'dental_xray';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'c_arm';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'dexa';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'angiography';
