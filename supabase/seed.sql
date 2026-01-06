-- SASQART QA System - Test Definitions Seed Data
-- Based on SASQART Practice Guidelines 2024

-- ============================================================================
-- Clear existing test definitions (for re-seeding)
-- ============================================================================
DELETE FROM qa_test_definitions;

-- ============================================================================
-- Cobalt-60 Teletherapy Units (Table 2)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('cobalt60', 'DCO1', 'daily', 'Door interlock or last person out', 'Functional', NULL, 'Safety', 1),
('cobalt60', 'DCO2', 'daily', 'Beam status indicators', 'Functional', NULL, 'Safety', 2),
('cobalt60', 'DCO3', 'daily', 'Patient audio-visual monitors', 'Functional', NULL, 'Safety', 3),
('cobalt60', 'DCO4', 'daily', 'Lasers/cross-wires', '1 mm', '2 mm', 'Mechanical', 4),
('cobalt60', 'DCO5', 'daily', 'Optical distance indicator', '1 mm', '2 mm', 'Mechanical', 5),
('cobalt60', 'DCO6', 'daily', 'Optical back pointer', '2 mm', '3 mm', 'Mechanical', 6),
('cobalt60', 'DCO7', 'daily', 'Field size indicator', '1 mm', '2 mm', 'Mechanical', 7),
-- Monthly
('cobalt60', 'MCO1', 'monthly', 'Motion interlock', 'Functional', NULL, 'Safety', 10),
('cobalt60', 'MCO2', 'monthly', 'Couch brakes', 'Functional', NULL, 'Mechanical', 11),
('cobalt60', 'MCO3', 'monthly', 'Room radiation monitors', 'Functional', NULL, 'Safety', 12),
('cobalt60', 'MCO4', 'monthly', 'Emergency off', 'Functional', NULL, 'Safety', 13),
('cobalt60', 'MCO5', 'monthly', 'Beam interrupt/counters', 'Functional', NULL, 'Safety', 14),
('cobalt60', 'MCO6', 'monthly', 'Head swivel lock', 'Functional', NULL, 'Mechanical', 15),
('cobalt60', 'MCO7', 'monthly', 'Wedge, tray interlocks', 'Functional', NULL, 'Safety', 16),
('cobalt60', 'MCO8', 'monthly', 'Gantry angle readouts', '0.5°', '1°', 'Mechanical', 17),
('cobalt60', 'MCO9', 'monthly', 'Collimator angle readouts', '0.5°', '1°', 'Mechanical', 18),
('cobalt60', 'MCO10', 'monthly', 'Couch position readouts', '1 mm', '2 mm', 'Mechanical', 19),
('cobalt60', 'MCO11', 'monthly', 'Couch isocentre', '1 mm', '2 mm', 'Mechanical', 20),
('cobalt60', 'MCO12', 'monthly', 'Couch angle', '0.5°', '1°', 'Mechanical', 21),
('cobalt60', 'MCO13', 'monthly', 'Optical distance indicator (extended)', '1 mm', '2 mm', 'Mechanical', 22),
('cobalt60', 'MCO14', 'monthly', 'Light/radiation field coincidence', '1 mm', '2 mm', 'Dosimetry', 23),
('cobalt60', 'MCO15', 'monthly', 'Beam flatness/symmetry', '2%', '3%', 'Dosimetry', 24),
('cobalt60', 'MCO16', 'monthly', 'Output constancy', '2%', '3%', 'Dosimetry', 25),
('cobalt60', 'MCO17', 'monthly', 'Records', 'Complete', NULL, 'Documentation', 26),
-- Annual
('cobalt60', 'ACO1', 'annual', 'Physical wedge transmission', '2%', '3%', 'Dosimetry', 30),
('cobalt60', 'ACO2', 'annual', 'Tray transmission', '2%', '3%', 'Dosimetry', 31),
('cobalt60', 'ACO3', 'annual', 'Absolute calibration (SSDL)', '2%', '3%', 'Dosimetry', 32),
('cobalt60', 'ACO4', 'annual', 'PDD/TMR check', '2%', '3%', 'Dosimetry', 33),
('cobalt60', 'ACO5', 'annual', 'Collimator rotation isocentre', '1 mm', '2 mm', 'Mechanical', 34),
('cobalt60', 'ACO6', 'annual', 'Gantry rotation isocentre', '1 mm', '2 mm', 'Mechanical', 35),
('cobalt60', 'ACO7', 'annual', 'Independent QC review', 'Complete', NULL, 'Documentation', 36);

-- ============================================================================
-- External Kilovoltage X-ray Therapy (Table 3)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('kilovoltage', 'DK1', 'daily', 'Patient monitoring audio-visual devices', 'Functional', NULL, 'Safety', 1),
('kilovoltage', 'DK2', 'daily', 'Door closing mechanism and interlock', 'Functional', NULL, 'Safety', 2),
('kilovoltage', 'DK3', 'daily', 'Couch movement and brakes', 'Functional', NULL, 'Mechanical', 3),
('kilovoltage', 'DK4', 'daily', 'Unit motions and motion stops', 'Functional', NULL, 'Mechanical', 4),
('kilovoltage', 'DK5', 'daily', 'Interlocks for added filters/kV-filter choice', 'Functional', NULL, 'Safety', 5),
('kilovoltage', 'DK6', 'daily', 'Beam status indicators', 'Functional', NULL, 'Safety', 6),
('kilovoltage', 'DK7', 'daily', 'Beam-off at key-off test', 'Functional', NULL, 'Safety', 7),
('kilovoltage', 'DK8', 'daily', 'kV and mA indicators', 'Functional', NULL, 'Electrical', 8),
('kilovoltage', 'DK9', 'daily', 'Backup timer/monitor unit channel check', '1%', '2%', 'Dosimetry', 9),
-- Monthly
('kilovoltage', 'MK1', 'monthly', 'Mechanical stability and safety', 'Functional', NULL, 'Mechanical', 10),
('kilovoltage', 'MK2', 'monthly', 'Cone selection and competency', 'Functional', NULL, 'Mechanical', 11),
('kilovoltage', 'MK3', 'monthly', 'Physical distance indicators', '2 mm', '3 mm', 'Mechanical', 12),
('kilovoltage', 'MK4', 'monthly', 'Light/x-ray field size indicator', '2 mm', '3 mm', 'Mechanical', 13),
('kilovoltage', 'MK5', 'monthly', 'Light/x-ray field coincidence', '2 mm', '3 mm', 'Dosimetry', 14),
('kilovoltage', 'MK6', 'monthly', 'Dosimetric test: Output check', '3%', '5%', 'Dosimetry', 15),
('kilovoltage', 'MK7', 'monthly', 'Emergency off test', 'Functional', NULL, 'Safety', 16),
('kilovoltage', 'MK8', 'monthly', 'Records', 'Complete', NULL, 'Documentation', 17),
-- Annual
('kilovoltage', 'AK1', 'annual', 'Angle readouts verification', '1°', '2°', 'Mechanical', 20),
('kilovoltage', 'AK2', 'annual', 'Flatness and symmetry', '3%', '5%', 'Dosimetry', 21),
('kilovoltage', 'AK3', 'annual', 'Timer and end-effect error', '1%', '2%', 'Dosimetry', 22),
('kilovoltage', 'AK4', 'annual', 'Absolute calibration', '3%', '5%', 'Dosimetry', 23),
('kilovoltage', 'AK5', 'annual', 'HVL measurement', '10%', '15%', 'Dosimetry', 24),
('kilovoltage', 'AK6', 'annual', 'Output factors (all cones)', '3%', '5%', 'Dosimetry', 25),
('kilovoltage', 'AK7', 'annual', 'Independent QC review', 'Complete', NULL, 'Documentation', 26);

-- ============================================================================
-- Internal Kilovoltage - Intraoperative (Table 4)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('kilovoltage_intraop', 'DKI1', 'daily', 'PDA Source Check (Isotropy)', '±10%', '15%', 'Dosimetry', 1),
('kilovoltage_intraop', 'DKI2', 'daily', 'PAICH Output Check (Dose Rate)', '±5%', '10%', 'Dosimetry', 2),
('kilovoltage_intraop', 'DKI3', 'daily', 'Patient vitals monitoring (Vitals Screen)', 'Functional', NULL, 'Safety', 3),
('kilovoltage_intraop', 'DKI4', 'daily', 'Applicator integrity', 'Not Damaged', NULL, 'Mechanical', 4),
-- Monthly
('kilovoltage_intraop', 'MKI1', 'monthly', 'PDA Source Check (Isotropy)', '±10%', '15%', 'Dosimetry', 10),
('kilovoltage_intraop', 'MKI2', 'monthly', 'PAICH Output Check (Dose Rate)', '±5%', '10%', 'Dosimetry', 11),
-- Biannual
('kilovoltage_intraop', 'SKI1', 'biannual', 'Chamber Constancy Check', '±1%', NULL, 'Dosimetry', 20),
('kilovoltage_intraop', 'SKI2', 'biannual', 'Environmental dose survey', 'License conditions', NULL, 'Safety', 21),
-- Annual
('kilovoltage_intraop', 'AKI1', 'annual', 'Alignment (Probe Adjuster)', '0.1', '0.2', 'Mechanical', 30),
('kilovoltage_intraop', 'AKI2', 'annual', 'Steering (Dynamic Offsets)', 'Successful', NULL, 'Mechanical', 31),
('kilovoltage_intraop', 'AKI3', 'annual', 'Output – using chamber in water', '±5%', '10%', 'Dosimetry', 32),
('kilovoltage_intraop', 'AKI4', 'annual', 'Isotropy – using chamber or TLDs', '±5%', '10%', 'Dosimetry', 33),
('kilovoltage_intraop', 'AKI5', 'annual', 'Depth Dose', '±5%', '10%', 'Dosimetry', 34),
('kilovoltage_intraop', 'AKI6', 'annual', 'Calibration', 'Manufacturer spec', NULL, 'Dosimetry', 35),
('kilovoltage_intraop', 'AKI7', 'annual', 'Date and time', '±5 min', NULL, 'System', 36),
('kilovoltage_intraop', 'AKI8', 'annual', 'Temperature', '±1°C', NULL, 'Environment', 37),
('kilovoltage_intraop', 'AKI9', 'annual', 'Pressure', '±2 mbar', NULL, 'Environment', 38),
('kilovoltage_intraop', 'AKI10', 'annual', 'Independent quality control review', 'Complete', NULL, 'Documentation', 39);

-- ============================================================================
-- CT Scanners and CT-Simulators (Table 5)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('ct_simulator', 'DCS1', 'daily', 'Beam status indicators', 'Functional', NULL, 'Safety', 1),
('ct_simulator', 'DCS2', 'daily', 'CT number for water – mean (accuracy)', '0 ± 3 HU', '0 ± 5 HU', 'Image Quality', 2),
('ct_simulator', 'DCS3', 'daily', 'CT number for water – standard deviation (noise)', '5 HU', '10 HU', 'Image Quality', 3),
('ct_simulator', 'DCS4', 'daily', 'CT number for water – mean vs position (uniformity)', '5 HU', '10 HU', 'Image Quality', 4),
('ct_simulator', 'DCS5', 'daily', 'Audio-video intercom systems', 'Functional', NULL, 'Safety', 5),
('ct_simulator', 'DCS6', 'daily', 'Respiratory and surface monitoring system', 'Functional', NULL, 'Safety', 6),
('ct_simulator', 'DCS7', 'daily', '4D-CT: Calibration verification', 'Correct', NULL, '4D-CT', 7),
-- Biannual
('ct_simulator', 'BACS1', 'biannual', 'Emergency off buttons', 'Functional', NULL, 'Safety', 10),
('ct_simulator', 'BACS2', 'biannual', 'Lasers: Alignment and motion', '1 mm', '2 mm', 'Mechanical', 11),
('ct_simulator', 'BACS3', 'biannual', 'CT number accuracy of other material', '4 HU', '10 HU', 'Image Quality', 12),
('ct_simulator', 'BACS4', 'biannual', 'Low contrast resolution', 'Reproducible', NULL, 'Image Quality', 13),
('ct_simulator', 'BACS5', 'biannual', 'High contrast resolution (in-plane)', '5 lp/cm', NULL, 'Image Quality', 14),
('ct_simulator', 'BACS6', 'biannual', 'Slice thickness/sensitivity profile', '0.5 mm', '1 mm', 'Image Quality', 15),
('ct_simulator', 'BACS7', 'biannual', 'Artifacts', 'Acceptable', NULL, 'Image Quality', 16),
('ct_simulator', 'BACS8', 'biannual', 'Records', 'Complete', NULL, 'Documentation', 17),
-- Annual
('ct_simulator', 'ACS1', 'annual', 'Gantry tilt (where used)', '1°', '2°', 'Mechanical', 20),
('ct_simulator', 'ACS2', 'annual', 'Slice localisation from pilot', '0.5', '1', 'Image Quality', 21),
('ct_simulator', 'ACS3', 'annual', 'Lasers: Parallel to scan plane', '1 mm', '2 mm', 'Mechanical', 22),
('ct_simulator', 'ACS4', 'annual', 'Lasers: Orthogonality', '1 mm', '2 mm', 'Mechanical', 23),
('ct_simulator', 'ACS5', 'annual', 'Lasers: Position from scan plane', '1 mm', '2 mm', 'Mechanical', 24),
('ct_simulator', 'ACS6', 'annual', 'Lasers: Linearity of translatable lasers', '1 mm', '2 mm', 'Mechanical', 25),
('ct_simulator', 'ACS7', 'annual', 'Couch level: Lateral and longitudinal', '1 mm', '2 mm', 'Mechanical', 26),
('ct_simulator', 'ACS8', 'annual', 'Couch motions: Vertical and longitudinal', '1 mm', '2 mm', 'Mechanical', 27),
('ct_simulator', 'ACS9', 'annual', 'Independent quality control review', 'Complete', NULL, 'Documentation', 28),
-- Biennial
('ct_simulator', 'BECS1', 'biennial', 'CT number accuracy (RED)', '0.02 RED', '0.03 RED', 'Image Quality', 30),
('ct_simulator', 'BECS2', 'biennial', 'Radiation Dose (CTDIvol)', '10%', '15%', 'Dosimetry', 31),
('ct_simulator', 'BECS3', 'biennial', '4D-CT: Radiation Dose (CTDIvol)', '10%', '15%', '4D-CT', 32),
('ct_simulator', 'BECS4', 'biennial', '4D-CT: Amplitude and periodicity', '1 mm, 0.1 s', NULL, '4D-CT', 33),
('ct_simulator', 'BECS5', 'biennial', '4D-CT: Reconstruction and phase binning', 'Functional', NULL, '4D-CT', 34),
('ct_simulator', 'BECS6', 'biennial', '4D-CT: Amplitude of reconstructed target', '2 mm', NULL, '4D-CT', 35),
('ct_simulator', 'BECS7', 'biennial', '4D-CT: Spatial integrity and positioning', '2 mm', NULL, '4D-CT', 36),
('ct_simulator', 'BECS8', 'biennial', '4D-CT: CT number accuracy and std dev', '10 HU', NULL, '4D-CT', 37),
('ct_simulator', 'BECS9', 'biennial', '4D-CT: High contrast resolution', '5 lp/cm', NULL, '4D-CT', 38),
('ct_simulator', 'BECS10', 'biennial', '4D-CT: Low contrast resolution', 'Reproducible', NULL, '4D-CT', 39),
('ct_simulator', 'BECS11', 'biennial', '4D-CT: Slice thickness', '0.5 mm', '1 mm', '4D-CT', 40),
('ct_simulator', 'BECS12', 'biennial', '4D-CT: Intensity projection reconstruction', '2 mm/10 HU', NULL, '4D-CT', 41),
('ct_simulator', 'BECS13', 'biennial', '4D-CT: Import into TPS', 'Correct', NULL, '4D-CT', 42);

-- ============================================================================
-- Medical Linear Accelerators - Linacs (Table 24)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, display_order) VALUES
-- Daily
('linac', 'DL1', 'daily', 'Door interlock/last person out', 'Functional', NULL, 'Safety', false, NULL, 1),
('linac', 'DL2', 'daily', 'Beam status indicators', 'Functional', NULL, 'Safety', false, NULL, 2),
('linac', 'DL3', 'daily', 'Patient audio-visual monitors', 'Functional', NULL, 'Safety', false, NULL, 3),
('linac', 'DL4', 'daily', 'Motion interlock', 'Functional', NULL, 'Safety', false, NULL, 4),
('linac', 'DL5', 'daily', 'Couch brakes', 'Functional', NULL, 'Mechanical', false, NULL, 5),
('linac', 'DL6', 'daily', 'Room radiation monitors (where available)', 'Functional', NULL, 'Safety', false, NULL, 6),
('linac', 'DL7', 'daily', 'Beam interrupt/counters', 'Functional', NULL, 'Safety', false, NULL, 7),
('linac', 'DL8', 'daily', 'Output constancy – photons', '2.00%', '3.00%', 'Dosimetry', true, '%', 8),
('linac', 'DL9', 'daily', 'Output constancy – electrons', '2.00%', '3.00%', 'Dosimetry', true, '%', 9),
-- Monthly
('linac', 'ML1', 'monthly', 'Emergency off (alternate monthly)', 'Functional', NULL, 'Safety', false, NULL, 10),
('linac', 'ML2', 'monthly', 'Lasers/crosswires', '1 mm', '2 mm', 'Mechanical', true, 'mm', 11),
('linac', 'ML3', 'monthly', 'Optical distance indicator', '1 mm', '2 mm', 'Mechanical', true, 'mm', 12),
('linac', 'ML4', 'monthly', 'Field size indicator', '1 mm', '2 mm', 'Mechanical', true, 'mm', 13),
('linac', 'ML5', 'monthly', 'Wedge factors (dynamic or virtual)', '1.00%', '2.00%', 'Dosimetry', true, '%', 14),
('linac', 'ML6', 'monthly', 'Gantry angle readouts', '0.5°', '1°', 'Mechanical', true, '°', 15),
('linac', 'ML7', 'monthly', 'Collimator angle readouts', '0.5°', '1°', 'Mechanical', true, '°', 16),
('linac', 'ML8', 'monthly', 'Couch position readouts', '1 mm', '2 mm', 'Mechanical', true, 'mm', 17),
('linac', 'ML9', 'monthly', 'Couch isocentre', '1 mm', '2 mm', 'Mechanical', true, 'mm', 18),
('linac', 'ML10', 'monthly', 'Couch angle', '0.5°', '1°', 'Mechanical', true, '°', 19),
('linac', 'ML11', 'monthly', 'Collimator rotation isocentre', '1 mm', '2 mm', 'Mechanical', true, 'mm', 20),
('linac', 'ML12', 'monthly', 'Light/radiation field coincidence', '1 mm', '2 mm', 'Dosimetry', true, 'mm', 21),
('linac', 'ML13', 'monthly', 'Beam flatness constancy', '1%', '2%', 'Dosimetry', true, '%', 22),
('linac', 'ML14', 'monthly', 'Beam symmetry constancy', '1%', '2%', 'Dosimetry', true, '%', 23),
('linac', 'ML15', 'monthly', 'Relative dosimetry constancy', '1%', '2%', 'Dosimetry', true, '%', 24),
('linac', 'ML16', 'monthly', 'Accuracy of QA records', 'Complete', NULL, 'Documentation', false, NULL, 25),
-- Quarterly
('linac', 'QL1', 'quarterly', 'Central axis depth dose reproducibility', '1%/2mm', '2%/3mm', 'Dosimetry', true, '%/mm', 30),
-- Annual
('linac', 'AL1', 'annual', 'Accessory mechanical integrity', 'Safe', NULL, 'Mechanical', false, NULL, 40),
('linac', 'AL2', 'annual', 'Accessory interlocks', 'Functional', NULL, 'Safety', false, NULL, 41),
('linac', 'AL3', 'annual', 'ODI at extended distances', '1 mm', '2 mm', 'Mechanical', true, 'mm', 42),
('linac', 'AL4', 'annual', 'Light/rad coincidence vs gantry', '1 mm', '2 mm', 'Dosimetry', true, 'mm', 43),
('linac', 'AL5', 'annual', 'Field size vs gantry angle', '1 mm', '2 mm', 'Mechanical', true, 'mm', 44),
('linac', 'AL6', 'annual', 'TRS-398 calibration', '1%', '2%', 'Dosimetry', true, '%', 45),
('linac', 'AL7', 'annual', 'Output factors', '1%', '2%', 'Dosimetry', true, '%', 46),
('linac', 'AL8', 'annual', 'Wedge transmission and profiles', '1%', '2%', 'Dosimetry', true, '%', 47),
('linac', 'AL9', 'annual', 'Accessory transmission factors', '1%', '2%', 'Dosimetry', true, '%', 48),
('linac', 'AL10', 'annual', 'Output vs gantry angle', '1%', '2%', 'Dosimetry', true, '%', 49),
('linac', 'AL11', 'annual', 'Symmetry vs gantry angle', '1%', '2%', 'Dosimetry', true, '%', 50),
('linac', 'AL12', 'annual', 'Monitor unit linearity', '1%', '2%', 'Dosimetry', true, '%', 51),
('linac', 'AL13', 'annual', 'Monitor unit end effect', '< 1 MU', '< 2 MU', 'Dosimetry', true, 'MU', 52),
('linac', 'AL14', 'annual', 'Collimator rotation isocentre', '1 mm', '2 mm', 'Mechanical', true, 'mm', 53),
('linac', 'AL15', 'annual', 'Gantry rotation isocentre', '1 mm', '2 mm', 'Mechanical', true, 'mm', 54),
('linac', 'AL16', 'annual', 'Couch rotation isocentre', '1 mm', '2 mm', 'Mechanical', true, 'mm', 55),
('linac', 'AL17', 'annual', 'Coincidence of axes', '1 mm', '2 mm', 'Mechanical', true, 'mm', 56),
('linac', 'AL18', 'annual', 'Independent review', 'Complete', NULL, 'Documentation', false, NULL, 57);

-- ============================================================================
-- MLC - Multileaf Collimators (Table 25)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Monthly
('mlc', 'MM1', 'monthly', 'Light and radiation field coincidence', '1 mm', '2 mm', 'Dosimetry', 1),
('mlc', 'MM2', 'monthly', 'Leaf positions for standard field template', '1 mm', '2 mm', 'Mechanical', 2),
-- Annual
('mlc', 'AM1', 'annual', 'Leaf transmission (all energies)', 'Reproducibility', NULL, 'Dosimetry', 10),
('mlc', 'AM2', 'annual', 'Leakage between leaves (all energies)', 'Reproducibility', NULL, 'Dosimetry', 11),
('mlc', 'AM3', 'annual', 'Transmission through abutting leaves', 'Reproducibility', NULL, 'Dosimetry', 12),
('mlc', 'AM4', 'annual', 'Stability with gantry rotation', 'Reproducibility', NULL, 'Mechanical', 13),
('mlc', 'AM5', 'annual', 'Alignment with jaws', NULL, '1°/1 mm', 'Mechanical', 14),
('mlc', 'AM6', 'annual', 'Records', 'Complete', NULL, 'Documentation', 15),
('mlc', 'AM7', 'annual', 'Independent quality control review', 'Complete', NULL, 'Documentation', 16);

-- ============================================================================
-- EPID - Portal Imaging (Table 19 & 20)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('epid', 'DE1', 'daily', 'Mechanical and Electrical integrity', 'Functional', NULL, 'Safety', 1),
('epid', 'DE2', 'daily', 'Functionality and Repositioning', '1 mm', '2 mm', 'Mechanical', 2),
-- Monthly
('epid', 'ME1', 'monthly', 'Collision interlocks', 'Functional', NULL, 'Safety', 10),
('epid', 'ME2', 'monthly', 'Positioning in the imaging plane', '1 mm', '2 mm', 'Mechanical', 11),
('epid', 'ME3', 'monthly', 'Image quality', 'Reproducibility', NULL, 'Image Quality', 12),
('epid', 'ME4', 'monthly', 'Artifacts', 'Reproducibility', NULL, 'Image Quality', 13),
('epid', 'ME5', 'monthly', 'Spatial distortion', '1 mm', '2 mm', 'Image Quality', 14),
('epid', 'ME6', 'monthly', 'Monitor controls', 'Reproducibility', NULL, 'System', 15),
('epid', 'ME7', 'monthly', 'Records', 'Complete', NULL, 'Documentation', 16),
-- Quarterly (dosimetry)
('epid', 'EP1', 'quarterly', 'Fluence map reproduction and uniformity (dosimetry)', '2%/2 mm', '3%/3 mm', 'Dosimetry', 20),
-- As needed
('epid', 'EP2', 'as_needed', 'Calibration (dosimetry)', '1%', '2%', 'Dosimetry', 21),
-- Annual
('epid', 'AE1', 'annual', 'Positioning perpendicular to imaging plane', '5 mm', '10 mm', 'Mechanical', 30),
('epid', 'AE2', 'annual', 'Contrast and Spatial resolution', 'Reproducibility', NULL, 'Image Quality', 31),
('epid', 'AE3', 'annual', 'Noise', 'Reproducibility', NULL, 'Image Quality', 32),
('epid', 'AE4', 'annual', 'On screen measurement tools', '0.5 mm', '1 mm', 'System', 33),
('epid', 'AE5', 'annual', 'Set-up verification tools', '0.5 mm, 0.5°', '1 mm, 1°', 'System', 34),
('epid', 'AE6', 'annual', 'MV Isocentre and panel alignment', 'Manufacturer spec', NULL, 'Mechanical', 35),
('epid', 'AE7', 'annual', 'Independent QC review', 'Complete', NULL, 'Documentation', 36);

-- ============================================================================
-- Brachytherapy HDR/PDR/LDR Remote Afterloaders (Table 18)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('brachytherapy_hdr', 'DBR1', 'daily', 'Door interlock/last person out', 'Functional', NULL, 'Safety', 1),
('brachytherapy_hdr', 'DBR2', 'daily', 'Treatment interrupt', 'Functional', NULL, 'Safety', 2),
('brachytherapy_hdr', 'DBR3', 'daily', 'Emergency off (console)', 'Functional', NULL, 'Safety', 3),
('brachytherapy_hdr', 'DBR4', 'daily', 'Room radiation monitor(s)', 'Functional', NULL, 'Safety', 4),
('brachytherapy_hdr', 'DBR5', 'daily', 'Room radiation warning lights', 'Functional', NULL, 'Safety', 5),
('brachytherapy_hdr', 'DBR6', 'daily', 'Console displays (status, date, time, source strength)', 'Verify', NULL, 'System', 6),
('brachytherapy_hdr', 'DBR7', 'daily', 'Printer operation, Paper supply', 'Functional', NULL, 'System', 7),
('brachytherapy_hdr', 'DBR8', 'daily', 'Data transfer from Planning Computer', 'Functional', NULL, 'System', 8),
('brachytherapy_hdr', 'DBR9', 'daily', 'Audio/Visual communication system', 'Functional', NULL, 'Safety', 9),
('brachytherapy_hdr', 'DBR10', 'daily', 'Source positional accuracy', '1 mm', '2 mm', 'Dosimetry', 10),
('brachytherapy_hdr', 'DBR11', 'daily', 'Dwell time accuracy', '1%', '2%', 'Dosimetry', 11),
('brachytherapy_hdr', 'DBR12', 'daily', 'PDR Sequencing', 'Functional', NULL, 'System', 12),
-- Quarterly
('brachytherapy_hdr', 'QBR1', 'quarterly', 'Mechanical integrity of applicators, guide tube', 'Functional', NULL, 'Mechanical', 20),
('brachytherapy_hdr', 'QBR2', 'quarterly', 'In-room emergency off buttons', 'Functional', NULL, 'Safety', 21),
('brachytherapy_hdr', 'QBR3', 'quarterly', 'Power failure recovery', 'Functional', NULL, 'Safety', 22),
('brachytherapy_hdr', 'QBR4', 'quarterly', 'Source strength measurement', '3%', '5%', 'Dosimetry', 23),
('brachytherapy_hdr', 'QBR5', 'quarterly', 'Source positional accuracy (autoradiograph)', '1 mm', '2 mm', 'Dosimetry', 24),
('brachytherapy_hdr', 'QBR6', 'quarterly', 'Dwell time accuracy (long dwell)', '1%', '2%', 'Dosimetry', 25),
-- Annual
('brachytherapy_hdr', 'ABR1', 'annual', 'Transit dose', 'Characterize', NULL, 'Dosimetry', 30),
('brachytherapy_hdr', 'ABR2', 'annual', 'Timer linearity', '1%', '2%', 'Dosimetry', 31),
('brachytherapy_hdr', 'ABR3', 'annual', 'Length of source guide tube', '1 mm', '2 mm', 'Mechanical', 32),
('brachytherapy_hdr', 'ABR4', 'annual', 'Independent QC review', 'Complete', NULL, 'Documentation', 33);

-- ============================================================================
-- Conventional Radiotherapy Simulators (Table 29)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('conventional_simulator', 'DS1', 'daily', 'Door interlock', 'Functional', NULL, 'Safety', 1),
('conventional_simulator', 'DS2', 'daily', 'Beam status indicators', 'Functional', NULL, 'Safety', 2),
('conventional_simulator', 'DS3', 'daily', 'Lasers/cross-wires', '1 mm', '2 mm', 'Mechanical', 3),
('conventional_simulator', 'DS4', 'daily', 'Optical distance indicator', '1 mm', '2 mm', 'Mechanical', 4),
('conventional_simulator', 'DS5', 'daily', 'Cross-wires/Reticle/Block tray', '1 mm', '2 mm', 'Mechanical', 5),
('conventional_simulator', 'DS6', 'daily', 'Field size indicators', '1 mm', '2 mm', 'Mechanical', 6),
-- Monthly
('conventional_simulator', 'MS1', 'monthly', 'Motion interlock', 'Functional', NULL, 'Safety', 10),
('conventional_simulator', 'MS2', 'monthly', 'Emergency off buttons', 'Functional', NULL, 'Safety', 11),
('conventional_simulator', 'MS3', 'monthly', 'Collision avoidance', 'Functional', NULL, 'Safety', 12),
('conventional_simulator', 'MS4', 'monthly', 'Gantry angle readouts', '0.5°', '1°', 'Mechanical', 13),
('conventional_simulator', 'MS5', 'monthly', 'Collimator angle readouts', '0.5°', '1°', 'Mechanical', 14),
('conventional_simulator', 'MS6', 'monthly', 'Couch position readouts', '1 mm', '2 mm', 'Mechanical', 15),
('conventional_simulator', 'MS7', 'monthly', 'Alignment of FAD movement', '1 mm', '2 mm', 'Mechanical', 16),
('conventional_simulator', 'MS8', 'monthly', 'Couch isocentre', '2 mm', '3 mm', 'Mechanical', 17),
('conventional_simulator', 'MS9', 'monthly', 'Couch parallelism', '1 mm', '2 mm', 'Mechanical', 18),
('conventional_simulator', 'MS10', 'monthly', 'Couch angle', '0.5°', '1°', 'Mechanical', 19),
('conventional_simulator', 'MS11', 'monthly', 'Laser/crosswire isocentricity', '1 mm', '2 mm', 'Mechanical', 20),
('conventional_simulator', 'MS12', 'monthly', 'Optical distance indicator', '1 mm', '2 mm', 'Mechanical', 21),
('conventional_simulator', 'MS13', 'monthly', 'Crosswire centring', '1 mm', '2 mm', 'Mechanical', 22),
('conventional_simulator', 'MS14', 'monthly', 'Light/radiation coincidence', '1 mm', '2 mm', 'Dosimetry', 23),
('conventional_simulator', 'MS15', 'monthly', 'Records', 'Complete', NULL, 'Documentation', 24),
-- Annual
('conventional_simulator', 'AS1', 'annual', 'Independent QC review', 'Complete', NULL, 'Documentation', 30);

-- ============================================================================
-- Treatment Planning Systems (Table 32)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Patient-specific
('tps', 'PTPS1', 'patient_specific', 'Patient-related data', 'Data verified', NULL, 'Data Verification', 1),
('tps', 'PTPS2', 'patient_specific', 'Beam geometry', 'Data verified', NULL, 'Data Verification', 2),
('tps', 'PTPS3', 'patient_specific', 'Dose distribution', 'Data verified', NULL, 'Dosimetry', 3),
('tps', 'PTPS4', 'patient_specific', 'MU/time per beam', '2 MU/2%', '3 MU/3%', 'Dosimetry', 4),
('tps', 'PTPS5', 'patient_specific', 'Plan data transfer', 'Data verified', NULL, 'Data Verification', 5),
-- Weekly
('tps', 'WTPS1', 'weekly', 'Back-ups', 'Successful', NULL, 'System', 10),
-- Quarterly
('tps', 'QTPS1', 'quarterly', 'Digitiser (if used clinically)', '2 mm', '3 mm', 'System', 20),
('tps', 'QTPS2', 'quarterly', 'Electronic plan transfer', 'Data verified', NULL, 'Data Verification', 21),
('tps', 'QTPS3', 'quarterly', 'Plan details', 'Data verified', NULL, 'Data Verification', 22),
('tps', 'QTPS4', 'quarterly', 'Plotter/Printer (if used clinically)', '2 mm', '3 mm', 'System', 23),
-- Biannual
('tps', 'STPS1', 'biannual', 'CT geometry/density', '2 mm/0.02 RED', '3 mm/0.03 RED', 'Image Quality', 30),
-- Annual
('tps', 'ATPS1', 'annual', 'Revalidation', '2%', '3%', 'Dosimetry', 40),
-- Commissioning
('tps', 'UTPS1', 'commissioning', 'End-to-end', '2%', '3%', 'Dosimetry', 50),
('tps', 'CTPS1', 'commissioning', 'Independent quality control review', 'Complete', NULL, 'Documentation', 51);

-- ============================================================================
-- Record and Verify Systems (Table 28)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Commissioning
('record_verify', 'CRV1', 'commissioning', 'Enter site details, assign user rights', 'Documented', NULL, 'System', 1),
('record_verify', 'CRV2', 'commissioning', 'Verification of treatment parameters', 'Correct', NULL, 'Data Verification', 2),
('record_verify', 'CRV3', 'commissioning', 'Light field tests', 'Correct', NULL, 'Mechanical', 3),
('record_verify', 'CRV4', 'commissioning', 'Imaging System', 'Correct', NULL, 'Imaging', 4),
-- Patient-specific
('record_verify', 'IPRV1', 'patient_specific', 'Verification of treatment parameters', 'Correct', NULL, 'Data Verification', 10),
('record_verify', 'IPRV2', 'patient_specific', 'Verification of dose recording', 'Correct', NULL, 'Dosimetry', 11),
-- Weekly
('record_verify', 'WRV1', 'weekly', 'Back-ups', 'Successful', NULL, 'System', 20);

-- ============================================================================
-- Gamma Knife Units (Table 30)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('gamma_knife', 'DSG1', 'daily', 'Door interlock/radiation on lights', 'Functional', NULL, 'Safety', 1),
('gamma_knife', 'DSG2', 'daily', 'Audio and visual contact with patient', 'Functional', NULL, 'Safety', 2),
('gamma_knife', 'DSG3', 'daily', 'System Alarm test', 'Functional', NULL, 'Safety', 3),
('gamma_knife', 'DSG4', 'daily', 'Machine interlocks (protection bars, docking)', 'Functional', NULL, 'Safety', 4),
('gamma_knife', 'DSG5', 'daily', 'Frame/Mask adaptor docking and angle interlock', 'Functional', NULL, 'Mechanical', 5),
('gamma_knife', 'DSG6', 'daily', 'Treatment initiate/timer terminate', 'Functional', NULL, 'System', 6),
('gamma_knife', 'DSG7', 'daily', 'System status indicator on console', 'Functional', NULL, 'System', 7),
('gamma_knife', 'DSG8', 'daily', 'Treatment pause and resume', 'Functional', NULL, 'System', 8),
('gamma_knife', 'DSG9', 'daily', 'Imaging Quality Assessment', 'Variable', NULL, 'Image Quality', 9),
('gamma_knife', 'DSG10', 'daily', 'Dose rate on specified date', 'Correct', NULL, 'Dosimetry', 10),
('gamma_knife', 'DSG11', 'daily', 'TPS Treatment time Calculation (Independent check)', '3%', '5%', 'Dosimetry', 11),
('gamma_knife', 'DSG12', 'daily', 'Focus Precision Test', '≤ 0.4 mm (Radial)', NULL, 'Mechanical', 12),
('gamma_knife', 'DSG13', 'daily', 'CBCT Precision', '≤ 0.4 mm', NULL, 'Imaging', 13),
('gamma_knife', 'DSG14', 'daily', 'HDMM system check', 'Functional', NULL, 'System', 14),
('gamma_knife', 'DSG15', 'daily', 'Emergency Procedure Posted', 'Functional', NULL, 'Safety', 15),
('gamma_knife', 'DSG16', 'daily', 'Radiation Survey meter Available', 'Functional', NULL, 'Safety', 16),
('gamma_knife', 'DSG17', 'daily', 'Relative Output Factors (ROFs)', 'Correct', NULL, 'Dosimetry', 17),
-- Monthly
('gamma_knife', 'MSG1', 'monthly', 'Extended alarm test', 'Functional', NULL, 'Safety', 20),
('gamma_knife', 'MSG2', 'monthly', 'UPS battery check', 'Functional', NULL, 'Safety', 21),
('gamma_knife', 'MSG3', 'monthly', 'Timer linearity', '1%', '2%', 'Dosimetry', 22),
('gamma_knife', 'MSG4', 'monthly', 'Timer constancy', '1%', '3%', 'Dosimetry', 23),
('gamma_knife', 'MSG5', 'monthly', 'Shutter correction/Timer Error', '0.01 min', '0.02 min', 'Dosimetry', 24),
('gamma_knife', 'MSG6', 'monthly', 'Timer accuracy', '0.1%', '0.2%', 'Dosimetry', 25),
('gamma_knife', 'MSG7', 'monthly', 'Radiation output (Dose rate)', '1.5%', '2%', 'Dosimetry', 26),
('gamma_knife', 'MSG8', 'monthly', 'Thermometer, barometer, ion chamber QA', 'SASQART standards', NULL, 'Calibration', 27),
('gamma_knife', 'MSG9', 'monthly', 'Emergency stop and reset', 'Functional', NULL, 'Safety', 28),
('gamma_knife', 'MSG10', 'monthly', 'Couch out (emergency release)', 'Functional', NULL, 'Safety', 29),
('gamma_knife', 'MSG11', 'monthly', 'Clearance test tool check', 'Functional', NULL, 'Mechanical', 30),
('gamma_knife', 'MSG12', 'monthly', 'CBCT Image quality', 'Specified values', NULL, 'Image Quality', 31),
('gamma_knife', 'MSG13', 'monthly', 'Documentation', 'Complete', NULL, 'Documentation', 32),
-- Annual
('gamma_knife', 'ASG1', 'annual', 'Acceptance functional tests', 'Functional', NULL, 'System', 40),
('gamma_knife', 'ASG2', 'annual', 'Calibration – IAEA TRS 398 and 483', '1%', '2%', 'Dosimetry', 41),
('gamma_knife', 'ASG3', 'annual', 'Dose profiles', '1 mm at 50%', NULL, 'Dosimetry', 42),
('gamma_knife', 'ASG4', 'annual', 'Relative Output Factors', '5%', '7%', 'Dosimetry', 43),
('gamma_knife', 'ASG5', 'annual', 'Radiation/mechanical isocentre coincidence', '0.5 mm', NULL, 'Mechanical', 44),
('gamma_knife', 'ASG6', 'annual', 'End-to-end test', '±5%/≤1.5 mm DTA', '≤3 mm', 'Dosimetry', 45),
('gamma_knife', 'ASG7', 'annual', 'CBCT dosimetry', '±35% from nominal', NULL, 'Dosimetry', 46),
('gamma_knife', 'ASG8', 'annual', 'Transit dose', '3 cGy/shot', NULL, 'Dosimetry', 47),
('gamma_knife', 'ASG9', 'annual', 'Independent Quality Control Review', 'Complete', NULL, 'Documentation', 48);

-- ============================================================================
-- Linac-based SRS/SRT (Table 31)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('linac_srs', 'DSL1', 'daily', 'Patient monitoring system', 'Functional', NULL, 'Safety', 1),
('linac_srs', 'DSL2', 'daily', 'SRS/SRT-specific machine interlocks', 'Functional', NULL, 'Safety', 2),
('linac_srs', 'DSL3', 'daily', 'IGRT matching and positioning accuracy', '1 mm', '1 mm', 'Imaging', 3),
('linac_srs', 'DSL4', 'daily', 'Laser and optical isocentre alignment', '1 mm', '1 mm', 'Mechanical', 4),
-- Patient-specific
('linac_srs', 'PSL1', 'patient_specific', 'Collision/clearance tests', 'Functional', NULL, 'Safety', 10),
('linac_srs', 'PSL2', 'patient_specific', 'Reference imaging and calculation parameter check', 'Appropriate', NULL, 'Data Verification', 11),
('linac_srs', 'PSL3', 'patient_specific', 'Measurement/Independent MU calculation', '3%/1 mm', '5%/1.5 mm', 'Dosimetry', 12),
('linac_srs', 'PSL4', 'patient_specific', 'Couch/Pedestal Locking', 'Functional', NULL, 'Mechanical', 13),
('linac_srs', 'PSL5', 'patient_specific', 'Field collimating device alignment', '0.5 mm', '1 mm', 'Mechanical', 14),
('linac_srs', 'PSL6', 'patient_specific', 'Field shape check', 'Correct', NULL, 'Mechanical', 15),
('linac_srs', 'PSL7', 'patient_specific', 'Head Frame motion', '1 mm', '1 mm', 'Mechanical', 16),
('linac_srs', 'PSL8', 'patient_specific', 'Gantry, couch, collimator radiation isocentre wobble', '0.7 mm', '1 mm', 'Mechanical', 17),
('linac_srs', 'PSL9', 'patient_specific', 'Average MV isocentre and IGRT axis coincidence', '0.5 mm', '1 mm', 'Mechanical', 18),
('linac_srs', 'PSL10', 'patient_specific', 'Checklist/Records', 'Complete', NULL, 'Documentation', 19),
-- Annual
('linac_srs', 'ASL1', 'annual', 'Acceptance functional tests', 'Functional', NULL, 'System', 30),
('linac_srs', 'ASL2', 'annual', 'Percentage depth dose', '1%', '2%', 'Dosimetry', 31),
('linac_srs', 'ASL3', 'annual', 'Dose profiles (FWHM)', '1 mm', '1 mm', 'Dosimetry', 32),
('linac_srs', 'ASL4', 'annual', 'Output factors', '2%', '3%', 'Dosimetry', 33),
('linac_srs', 'ASL5', 'annual', 'Gantry, couch, collimator radiation isocentre wobble', '0.7 mm', '1.0 mm', 'Mechanical', 34),
('linac_srs', 'ASL6', 'annual', 'Gantry, couch, collimator radiation, laser and IGRT isocentre coincidence', '0.5 mm', '1.0 mm', 'Mechanical', 35),
('linac_srs', 'ASL7', 'annual', 'End-to-end test', '3%/1 mm', '5%/1.5 mm', 'Dosimetry', 36),
('linac_srs', 'ASL8', 'annual', 'CT localisation performance', '0.5 mm', '1.0 mm', 'Imaging', 37),
('linac_srs', 'ASL9', 'annual', 'MRI localisation performance', '1.0 mm', '2.0 mm', 'Imaging', 38),
('linac_srs', 'ASL10', 'annual', 'Angiography localisation performance', '1 mm', '1 mm', 'Imaging', 39);

-- ============================================================================
-- Bore-based Linacs - Halcyon, TomoTherapy, MR-Linac (Table 34)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('bore_linac', 'DBL1', 'daily', 'Door interlock/last person out', 'Functional', NULL, 'Safety', 1),
('bore_linac', 'DBL2', 'daily', 'Beam status indicators', 'Functional', NULL, 'Safety', 2),
('bore_linac', 'DBL3', 'daily', 'Patient audio-visual monitors', 'Functional', NULL, 'Safety', 3),
('bore_linac', 'DBL4', 'daily', 'Motion interlock', 'Functional', NULL, 'Safety', 4),
('bore_linac', 'DBL5', 'daily', 'Couch brakes', 'Functional', NULL, 'Mechanical', 5),
('bore_linac', 'DBL6', 'daily', 'Room radiation monitors (where available)', 'Functional', NULL, 'Safety', 6),
('bore_linac', 'DBL7', 'daily', 'Beam interrupt/counters', 'Functional', NULL, 'Safety', 7),
('bore_linac', 'DBL8', 'daily', 'Output constancy – photons', '2.00%', '3.00%', 'Dosimetry', 8),
('bore_linac', 'DBL9', 'daily', 'Imaging and treatment isocentre coincidence', '< 1 mm', '< 2 mm', 'Mechanical', 9),
('bore_linac', 'DBL10', 'daily', 'Collision interlock – bore', 'Functional', NULL, 'Safety', 10),
-- Monthly
('bore_linac', 'MBL1', 'monthly', 'Lasers and isocentre coincidence', '1 mm', '2 mm', 'Mechanical', 20),
('bore_linac', 'MBL2', 'monthly', 'Couch position readouts', '1 mm', '2 mm', 'Mechanical', 21),
('bore_linac', 'MBL3', 'monthly', 'Beam (un)flatness/off-axis-intensity', 'Manufacturer spec', NULL, 'Dosimetry', 22),
('bore_linac', 'MBL4', 'monthly', 'Beam symmetry', '2.00%', '3.00%', 'Dosimetry', 23),
('bore_linac', 'MBL5', 'monthly', 'Reference dosimetry – TRS398', '1.00%', '2.00%', 'Dosimetry', 24),
('bore_linac', 'MBL6', 'monthly', 'MLC (if applicable)', 'See MLC table', NULL, 'Mechanical', 25),
('bore_linac', 'MBL7', 'monthly', 'MV and kV planar imaging (if applicable)', 'See IGRT table', NULL, 'Imaging', 26),
('bore_linac', 'MBL8', 'monthly', 'CBCT (if applicable)', 'See IGRT table', NULL, 'Imaging', 27),
('bore_linac', 'MBL9', 'monthly', 'Records', 'Complete', NULL, 'Documentation', 28),
-- Quarterly
('bore_linac', 'QBL1', 'quarterly', 'Emergency off buttons (alternate)', 'Functional', NULL, 'Safety', 30),
('bore_linac', 'QBL2', 'quarterly', 'Beam quality verification', 'Baseline', NULL, 'Dosimetry', 31),
-- Annual
('bore_linac', 'ABL1', 'annual', 'Absolute calibration TRS-398', '1%', '2%', 'Dosimetry', 40),
('bore_linac', 'ABL2', 'annual', 'Output factors', '1%', '2%', 'Dosimetry', 41),
('bore_linac', 'ABL3', 'annual', 'Independent QC review', 'Complete', NULL, 'Documentation', 42);

-- ============================================================================
-- IMRT/VMAT (Table 23)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Commissioning
('imrt_vmat', 'CVM1', 'commissioning', 'Isocentre calibration', '0.5 mm', '1 mm', 'Mechanical', 1),
('imrt_vmat', 'CVM2', 'commissioning', 'Leaf position transfer', 'Correct', '1 mm', 'Data Verification', 2),
('imrt_vmat', 'CVM3', 'commissioning', 'MU transfer', 'Correct', '0.1 MU', 'Data Verification', 3),
('imrt_vmat', 'CVM4', 'commissioning', 'Diaphragm transfer', 'Correct', '1 mm', 'Data Verification', 4),
('imrt_vmat', 'CVM5', 'commissioning', 'Gantry, collimator and couch transfer', 'Correct', '1°', 'Data Verification', 5),
('imrt_vmat', 'CVM6', 'commissioning', 'Interleaf transmission', '2%', '3%', 'Dosimetry', 6),
('imrt_vmat', 'CVM7', 'commissioning', 'Arc Dosimetry', '2%', '3%', 'Dosimetry', 7),
('imrt_vmat', 'CVM8', 'commissioning', 'Picket fence at various gantry angles', '0.5 mm', '1 mm', 'Mechanical', 8),
('imrt_vmat', 'CVM9', 'commissioning', 'Picket fence during arc delivery', '0.5 mm', '1 mm', 'Mechanical', 9),
('imrt_vmat', 'CVM10', 'commissioning', 'Gantry speed verification', '2%', '3%', 'Mechanical', 10),
('imrt_vmat', 'CVM11', 'commissioning', 'Dose rate verification', '2%', '3%', 'Dosimetry', 11),
('imrt_vmat', 'CVM12', 'commissioning', 'Beam flatness and symmetry during arcing', '3%', '4%', 'Dosimetry', 12),
('imrt_vmat', 'CVM13', 'commissioning', 'Beam flatness/symmetry at lower dose rate', '3%', '4%', 'Dosimetry', 13),
('imrt_vmat', 'CVM14', 'commissioning', 'Interrupt test', '2%/2 mm', '3%/3 mm', 'System', 14),
('imrt_vmat', 'CVM15', 'commissioning', 'Composite relative dose reproduction', '3%/3 mm', '4%/4 mm', 'Dosimetry', 15),
('imrt_vmat', 'CVM16', 'commissioning', 'Composite absolute dose reproduction', '3%/3 mm', '4%/4 mm', 'Dosimetry', 16);

-- ============================================================================
-- Radiation Protection (Table 26)
-- ============================================================================
INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, display_order) VALUES
-- Daily
('radiation_protection', 'DRP1', 'daily', 'Room area monitor (where required)', 'Functional', NULL, 'Safety', 1),
('radiation_protection', 'DRP2', 'daily', 'Radiation ON lights', 'Functional', NULL, 'Safety', 2),
-- Weekly
('radiation_protection', 'WRP1', 'weekly', 'Pregnant personnel monitored with direct read dosimeter', 'DoH Licensing Limits', NULL, 'Monitoring', 10),
-- Monthly
('radiation_protection', 'MRP1', 'monthly', 'Radiation worker monitoring', 'DoH Licensing Limits', NULL, 'Monitoring', 20),
-- Annual
('radiation_protection', 'ARP1', 'annual', 'Lead apron (where required) intact', 'Physical', NULL, 'Equipment', 30),
('radiation_protection', 'ARP2', 'annual', 'Lead apron (where required) image', 'X Ray', NULL, 'Equipment', 31),
('radiation_protection', 'ARP3', 'annual', 'Wipe test of all sealed radionuclides', 'Background', NULL, 'Safety', 32),
('radiation_protection', 'ARP4', 'annual', 'Documentation', 'Complete', NULL, 'Documentation', 33),
-- Biennial
('radiation_protection', 'BRP1', 'biennial', 'Room area monitor calibration verification', 'Performed', NULL, 'Calibration', 40),
('radiation_protection', 'BRP2', 'biennial', 'Survey meter calibration', 'Performed', NULL, 'Calibration', 41),
('radiation_protection', 'BRP3', 'biennial', 'Electronic Personal Dosimeter', 'Performed', NULL, 'Calibration', 42);

-- ============================================================================
-- Create function to handle new user registration
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'therapist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
