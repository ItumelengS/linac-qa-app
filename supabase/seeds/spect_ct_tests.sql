-- SPECT/CT QA Test Definitions
-- Based on IAEA, ACR, and manufacturer recommendations

-- =============================================
-- DAILY QA TESTS
-- =============================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, display_order, is_active)
VALUES
-- System checks
('spect_ct', 'DSC1', 'daily', 'System warm-up and initialization check', 'Functional', NULL, 'System', false, 1, true),
('spect_ct', 'DSC2', 'daily', 'Check detector head positioning and movement', 'Functional', NULL, 'Mechanical', false, 2, true),
('spect_ct', 'DSC3', 'daily', 'Verify collimator attachment and integrity', 'Secure, no damage', NULL, 'Mechanical', false, 3, true),
('spect_ct', 'DSC4', 'daily', 'Check patient bed movement and positioning', 'Functional', NULL, 'Mechanical', false, 4, true),
('spect_ct', 'DSC5', 'daily', 'Emergency stop functionality check', 'Functional', NULL, 'Safety', false, 5, true),

-- SPECT checks
('spect_ct', 'DSC6', 'daily', 'Energy window settings verification (photopeak)', 'Within ±2% of reference', '±1%', 'SPECT', true, 6, true),
('spect_ct', 'DSC7', 'daily', 'Background radiation level check', '<100 cps', '<50 cps', 'SPECT', true, 7, true),
('spect_ct', 'DSC8', 'daily', 'Uniformity check with flood source (extrinsic)', 'UFOV <5%, CFOV <4%', 'UFOV <3%, CFOV <2.5%', 'SPECT', true, 8, true),
('spect_ct', 'DSC9', 'daily', 'Visual inspection of flood image for artifacts', 'No artifacts visible', NULL, 'SPECT', false, 9, true),

-- CT checks
('spect_ct', 'DSC10', 'daily', 'CT warm-up and tube conditioning', 'Functional', NULL, 'CT', false, 10, true),
('spect_ct', 'DSC11', 'daily', 'CT laser alignment check', '±2mm', '±1mm', 'CT', true, 11, true),
('spect_ct', 'DSC12', 'daily', 'CT water phantom HU value verification', '0 ± 5 HU', '0 ± 3 HU', 'CT', true, 12, true),
('spect_ct', 'DSC13', 'daily', 'CT noise level check (standard deviation)', '<15 HU', '<10 HU', 'CT', true, 13, true),

-- Documentation
('spect_ct', 'DSC14', 'daily', 'Review previous day''s QC results if applicable', 'Reviewed', NULL, 'Documentation', false, 14, true),
('spect_ct', 'DSC15', 'daily', 'Log all daily QC results', 'Complete', NULL, 'Documentation', false, 15, true)
ON CONFLICT (equipment_type, test_id) DO NOTHING;

-- =============================================
-- WEEKLY QA TESTS
-- =============================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, display_order, is_active)
VALUES
-- SPECT Performance
('spect_ct', 'WSC1', 'weekly', 'Intrinsic uniformity measurement (without collimator)', 'UFOV <3.5%, CFOV <3%', 'UFOV <3%, CFOV <2.5%', 'SPECT', true, 1, true),
('spect_ct', 'WSC2', 'weekly', 'Spatial resolution check with bar phantom', 'Resolve all bars per baseline', NULL, 'SPECT', false, 2, true),
('spect_ct', 'WSC3', 'weekly', 'Energy resolution verification (FWHM at 140 keV)', '<12%', '<10%', 'SPECT', true, 3, true),
('spect_ct', 'WSC4', 'weekly', 'Center of rotation (COR) measurement', '<0.5 pixel', '<0.25 pixel', 'SPECT', true, 4, true),
('spect_ct', 'WSC5', 'weekly', 'Detector head tilt angle verification', '±0.5°', '±0.25°', 'SPECT', true, 5, true),

-- CT Performance
('spect_ct', 'WSC6', 'weekly', 'CT number accuracy (water, air, bone equivalent)', 'Within ±5 HU of baseline', '±3 HU', 'CT', true, 6, true),
('spect_ct', 'WSC7', 'weekly', 'CT uniformity check (center vs. periphery)', '<5 HU difference', '<3 HU', 'CT', true, 7, true),
('spect_ct', 'WSC8', 'weekly', 'CT slice thickness accuracy', '±1mm or ±20%', '±0.5mm or ±10%', 'CT', true, 8, true),
('spect_ct', 'WSC9', 'weekly', 'CT spatial resolution (high contrast)', 'Per baseline', NULL, 'CT', true, 9, true),
('spect_ct', 'WSC10', 'weekly', 'CT low contrast detectability', 'Per baseline', NULL, 'CT', true, 10, true),

-- Registration
('spect_ct', 'WSC11', 'weekly', 'SPECT/CT registration accuracy check', '<3mm', '<2mm', 'Registration', true, 11, true),
('spect_ct', 'WSC12', 'weekly', 'Review and trend weekly QC data', 'Complete', NULL, 'Documentation', false, 12, true)
ON CONFLICT (equipment_type, test_id) DO NOTHING;

-- =============================================
-- QUARTERLY QA TESTS
-- =============================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, display_order, is_active)
VALUES
-- SPECT Quantitative Performance
('spect_ct', 'QSC1', 'quarterly', 'SPECT sensitivity measurement (cps/MBq)', 'Within ±10% of baseline', '±5%', 'SPECT', true, 1, true),
('spect_ct', 'QSC2', 'quarterly', 'SPECT system spatial resolution (FWHM in mm)', 'Per manufacturer spec', NULL, 'SPECT', true, 2, true),
('spect_ct', 'QSC3', 'quarterly', 'Tomographic uniformity (cylinder phantom)', '<5% integral', '<3%', 'SPECT', true, 3, true),
('spect_ct', 'QSC4', 'quarterly', 'SPECT contrast and cold lesion detectability', 'Per baseline', NULL, 'SPECT', true, 4, true),
('spect_ct', 'QSC5', 'quarterly', 'Multiple energy window registration', '<2mm', '<1mm', 'SPECT', true, 5, true),

-- CT Comprehensive
('spect_ct', 'QSC6', 'quarterly', 'CT dose index (CTDI) measurement', 'Within ±20% of displayed', '±10%', 'CT Dosimetry', true, 6, true),
('spect_ct', 'QSC7', 'quarterly', 'CT table indexing accuracy', '±1mm', '±0.5mm', 'CT', true, 7, true),
('spect_ct', 'QSC8', 'quarterly', 'CT gantry tilt accuracy', '±1°', '±0.5°', 'CT', true, 8, true),
('spect_ct', 'QSC9', 'quarterly', 'CT patient positioning laser accuracy', '±2mm', '±1mm', 'CT', true, 9, true),

-- Attenuation Correction
('spect_ct', 'QSC10', 'quarterly', 'CT-based attenuation correction accuracy', '<5% error in quantification', '<3%', 'Quantification', true, 10, true),
('spect_ct', 'QSC11', 'quarterly', 'SPECT/CT fusion accuracy with phantom', '<3mm in all directions', '<2mm', 'Registration', true, 11, true),

-- Collimator Checks
('spect_ct', 'QSC12', 'quarterly', 'Collimator hole angulation check (LEHR, LEGP, etc.)', 'Per manufacturer spec', NULL, 'Collimators', false, 12, true),
('spect_ct', 'QSC13', 'quarterly', 'Collimator damage inspection', 'No visible damage', NULL, 'Collimators', false, 13, true)
ON CONFLICT (equipment_type, test_id) DO NOTHING;

-- =============================================
-- ANNUAL QA TESTS
-- =============================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, display_order, is_active)
VALUES
-- Comprehensive SPECT Performance
('spect_ct', 'ASC1', 'annual', 'Full NEMA NU-1 performance characterization', 'Per NEMA specifications', NULL, 'SPECT', true, 1, true),
('spect_ct', 'ASC2', 'annual', 'Intrinsic spatial resolution (X and Y)', 'Per manufacturer spec', NULL, 'SPECT', true, 2, true),
('spect_ct', 'ASC3', 'annual', 'Intrinsic spatial linearity (differential and integral)', '<1mm', '<0.5mm', 'SPECT', true, 3, true),
('spect_ct', 'ASC4', 'annual', 'Count rate performance and dead time', 'Per manufacturer spec', NULL, 'SPECT', true, 4, true),
('spect_ct', 'ASC5', 'annual', 'Multi-window spatial registration', '<2mm', '<1mm', 'SPECT', true, 5, true),

-- Comprehensive CT Performance
('spect_ct', 'ASC6', 'annual', 'Full ACR CT phantom evaluation', 'Pass all modules', NULL, 'CT', true, 6, true),
('spect_ct', 'ASC7', 'annual', 'CT dose profile and beam width measurement', 'Within ±2mm of nominal', NULL, 'CT Dosimetry', true, 7, true),
('spect_ct', 'ASC8', 'annual', 'CT dose (CTDIvol and DLP) for clinical protocols', 'Within DRLs', NULL, 'CT Dosimetry', true, 8, true),
('spect_ct', 'ASC9', 'annual', 'CT image quality for all clinical protocols', 'Per baseline', NULL, 'CT', true, 9, true),
('spect_ct', 'ASC10', 'annual', 'CT reconstruction algorithm verification', 'Per baseline', NULL, 'CT', true, 10, true),

-- SPECT/CT Integration
('spect_ct', 'ASC11', 'annual', 'Comprehensive SPECT/CT registration accuracy', '<2mm in all directions', '<1mm', 'Registration', true, 11, true),
('spect_ct', 'ASC12', 'annual', 'Quantitative SPECT accuracy (SUV equivalent)', 'Within ±10%', '±5%', 'Quantification', true, 12, true),

-- Mechanical and Safety
('spect_ct', 'ASC13', 'annual', 'Gantry rotation speed and accuracy', 'Per manufacturer spec', NULL, 'Mechanical', true, 13, true),
('spect_ct', 'ASC14', 'annual', 'Table weight capacity verification', 'Per manufacturer spec', NULL, 'Mechanical', false, 14, true),
('spect_ct', 'ASC15', 'annual', 'All emergency stops and interlocks', 'Functional', NULL, 'Safety', false, 15, true),
('spect_ct', 'ASC16', 'annual', 'Radiation survey of the room', 'Below regulatory limits', NULL, 'Safety', true, 16, true),

-- Documentation and Compliance
('spect_ct', 'ASC17', 'annual', 'Review and update written QC procedures', 'Complete', NULL, 'Documentation', false, 17, true),
('spect_ct', 'ASC18', 'annual', 'Physicist annual report compilation', 'Complete', NULL, 'Documentation', false, 18, true)
ON CONFLICT (equipment_type, test_id) DO NOTHING;
