-- ============================================================================
-- Update CT Simulator Tests to Require Measurements
-- ============================================================================
-- CT simulator tests with numeric HU tolerances need actual value inputs,
-- not just pass/fail buttons.

-- Daily CT Tests requiring HU measurements
UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'HU'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('DCS2', 'DCS3', 'DCS4');

-- Biannual CT Tests requiring measurements
UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'mm'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('BACS2');

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'HU'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('BACS3');

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'lp/cm'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('BACS5');

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'mm'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('BACS6');

-- Annual CT Tests requiring measurements
UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = '°'
WHERE equipment_type = 'ct_simulator'
AND test_id = 'ACS1';

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'mm'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('ACS2', 'ACS3', 'ACS4', 'ACS5', 'ACS6', 'ACS7', 'ACS8');

-- Biennial CT Tests requiring measurements
UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'RED'
WHERE equipment_type = 'ct_simulator'
AND test_id = 'BECS1';

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = '%'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('BECS2', 'BECS3');

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'mm'
WHERE equipment_type = 'ct_simulator'
AND test_id IN ('BECS4', 'BECS6', 'BECS7', 'BECS11');

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'HU'
WHERE equipment_type = 'ct_simulator'
AND test_id = 'BECS8';

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'lp/cm'
WHERE equipment_type = 'ct_simulator'
AND test_id = 'BECS9';

UPDATE qa_test_definitions
SET requires_measurement = true, measurement_unit = 'mm'
WHERE equipment_type = 'ct_simulator'
AND test_id = 'BECS12';
