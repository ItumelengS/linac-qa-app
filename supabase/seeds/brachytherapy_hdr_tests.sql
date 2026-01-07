-- SASQART Brachytherapy HDR/PDR QA Test Definitions
-- Based on South African Standards for Quality Assurance in Radiotherapy

-- Daily QA Tests for Brachytherapy HDR
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, display_order, is_active)
VALUES
  ('brachytherapy_hdr', 'HDR-D1', 'daily', 'Source position indicator check', 'Functional', NULL, 'Safety Systems', false, NULL, 1, true),
  ('brachytherapy_hdr', 'HDR-D2', 'daily', 'Door interlock function', 'Functional', NULL, 'Safety Systems', false, NULL, 2, true),
  ('brachytherapy_hdr', 'HDR-D3', 'daily', 'Emergency stop buttons', 'Functional', NULL, 'Safety Systems', false, NULL, 3, true),
  ('brachytherapy_hdr', 'HDR-D4', 'daily', 'Audio/visual monitors', 'Functional', NULL, 'Safety Systems', false, NULL, 4, true),
  ('brachytherapy_hdr', 'HDR-D5', 'daily', 'Radiation area monitors', 'Functional', NULL, 'Safety Systems', false, NULL, 5, true),
  ('brachytherapy_hdr', 'HDR-D6', 'daily', 'Treatment console indicators', 'Functional', NULL, 'Console Checks', false, NULL, 6, true),
  ('brachytherapy_hdr', 'HDR-D7', 'daily', 'Source retraction - manual', 'Functional', NULL, 'Safety Systems', false, NULL, 7, true),
  ('brachytherapy_hdr', 'HDR-D8', 'daily', 'Source retraction - automatic (power fail)', 'Functional', NULL, 'Safety Systems', false, NULL, 8, true),
  ('brachytherapy_hdr', 'HDR-D9', 'daily', 'Backup battery function', 'Functional', NULL, 'Safety Systems', false, NULL, 9, true),
  ('brachytherapy_hdr', 'HDR-D10', 'daily', 'Hand-held radiation monitor check', 'Functional', NULL, 'Radiation Safety', false, NULL, 10, true),
  ('brachytherapy_hdr', 'HDR-D11', 'daily', 'Treatment room survey post-treatment', 'Background levels', NULL, 'Radiation Safety', false, NULL, 11, true),
  ('brachytherapy_hdr', 'HDR-D12', 'daily', 'Applicator/catheter integrity check', 'No damage', NULL, 'Applicators', false, NULL, 12, true)
ON CONFLICT (equipment_type, test_id) DO UPDATE SET
  description = EXCLUDED.description,
  tolerance = EXCLUDED.tolerance,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- Quarterly QA Tests for Brachytherapy HDR
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, display_order, is_active)
VALUES
  ('brachytherapy_hdr', 'HDR-Q1', 'quarterly', 'Source strength verification (well chamber)', '±3%', '±5%', 'Source Calibration', true, 'U', 1, true),
  ('brachytherapy_hdr', 'HDR-Q2', 'quarterly', 'Source position accuracy - autoradiograph', '±1mm', '±2mm', 'Source Position', true, 'mm', 2, true),
  ('brachytherapy_hdr', 'HDR-Q3', 'quarterly', 'Timer accuracy', '±1%', '±2%', 'Timer', true, 's', 3, true),
  ('brachytherapy_hdr', 'HDR-Q4', 'quarterly', 'Source transit time', 'Baseline ±0.5s', NULL, 'Source Position', true, 's', 4, true),
  ('brachytherapy_hdr', 'HDR-Q5', 'quarterly', 'Applicator length verification', '±1mm', NULL, 'Applicators', true, 'mm', 5, true),
  ('brachytherapy_hdr', 'HDR-Q6', 'quarterly', 'Transfer tube integrity', 'No kinks/damage', NULL, 'Transfer System', false, NULL, 6, true),
  ('brachytherapy_hdr', 'HDR-Q7', 'quarterly', 'Indexer ring positions', '±1mm', NULL, 'Transfer System', true, 'mm', 7, true),
  ('brachytherapy_hdr', 'HDR-Q8', 'quarterly', 'TPS source data verification', 'Match certificate', NULL, 'Treatment Planning', false, NULL, 8, true),
  ('brachytherapy_hdr', 'HDR-Q9', 'quarterly', 'Emergency equipment check', 'Complete and functional', NULL, 'Emergency', false, NULL, 9, true),
  ('brachytherapy_hdr', 'HDR-Q10', 'quarterly', 'Documentation and procedures review', 'Current', NULL, 'Documentation', false, NULL, 10, true)
ON CONFLICT (equipment_type, test_id) DO UPDATE SET
  description = EXCLUDED.description,
  tolerance = EXCLUDED.tolerance,
  action_level = EXCLUDED.action_level,
  category = EXCLUDED.category,
  requires_measurement = EXCLUDED.requires_measurement,
  measurement_unit = EXCLUDED.measurement_unit,
  display_order = EXCLUDED.display_order;

-- Annual QA Tests for Brachytherapy HDR
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, display_order, is_active)
VALUES
  ('brachytherapy_hdr', 'HDR-A1', 'annual', 'Source calibration - independent measurement', '±3%', '±5%', 'Source Calibration', true, 'U', 1, true),
  ('brachytherapy_hdr', 'HDR-A2', 'annual', 'Well chamber calibration verification', '±2%', NULL, 'Calibration Equipment', true, '%', 2, true),
  ('brachytherapy_hdr', 'HDR-A3', 'annual', 'Source position accuracy - comprehensive', '±1mm', '±2mm', 'Source Position', true, 'mm', 3, true),
  ('brachytherapy_hdr', 'HDR-A4', 'annual', 'Dwell time accuracy - all channels', '±2%', NULL, 'Timer', true, '%', 4, true),
  ('brachytherapy_hdr', 'HDR-A5', 'annual', 'Source step size accuracy', '±1mm', NULL, 'Source Position', true, 'mm', 5, true),
  ('brachytherapy_hdr', 'HDR-A6', 'annual', 'All applicator sets - dimensional verification', '±1mm', NULL, 'Applicators', true, 'mm', 6, true),
  ('brachytherapy_hdr', 'HDR-A7', 'annual', 'TPS dose calculation verification', '±3%', '±5%', 'Treatment Planning', true, '%', 7, true),
  ('brachytherapy_hdr', 'HDR-A8', 'annual', 'TPS data transfer verification', 'No errors', NULL, 'Treatment Planning', false, NULL, 8, true),
  ('brachytherapy_hdr', 'HDR-A9', 'annual', 'Shielding survey', 'Within limits', NULL, 'Radiation Safety', true, 'µSv/h', 9, true),
  ('brachytherapy_hdr', 'HDR-A10', 'annual', 'Interlock system comprehensive test', 'All functional', NULL, 'Safety Systems', false, NULL, 10, true),
  ('brachytherapy_hdr', 'HDR-A11', 'annual', 'Emergency procedures drill', 'Completed satisfactorily', NULL, 'Emergency', false, NULL, 11, true),
  ('brachytherapy_hdr', 'HDR-A12', 'annual', 'Staff training records review', 'Current', NULL, 'Documentation', false, NULL, 12, true),
  ('brachytherapy_hdr', 'HDR-A13', 'annual', 'Preventive maintenance records review', 'Current', NULL, 'Documentation', false, NULL, 13, true),
  ('brachytherapy_hdr', 'HDR-A14', 'annual', 'Regulatory compliance check', 'Compliant', NULL, 'Documentation', false, NULL, 14, true)
ON CONFLICT (equipment_type, test_id) DO UPDATE SET
  description = EXCLUDED.description,
  tolerance = EXCLUDED.tolerance,
  action_level = EXCLUDED.action_level,
  category = EXCLUDED.category,
  requires_measurement = EXCLUDED.requires_measurement,
  measurement_unit = EXCLUDED.measurement_unit,
  display_order = EXCLUDED.display_order;
