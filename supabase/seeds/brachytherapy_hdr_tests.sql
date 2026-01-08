-- SASQART Brachytherapy HDR/PDR QA Test Definitions
-- Based on South African Standards for Quality Assurance in Radiotherapy (2025)
-- Reference: Fourie H, Alidzulwi T, Boonzaier WPE, et al. S. Afr. j. oncol. 2025; 9(0), a329
-- https://doi.org/10.4102/sajo.v9i0.329

-- First, remove old test definitions for brachytherapy_hdr to avoid conflicts
DELETE FROM qa_test_definitions WHERE equipment_type = 'brachytherapy_hdr';

-- ============================================================================
-- DAILY QA TESTS (DBR1-DBR12)
-- Perform once during every treatment day, separated by at least 12 hours.
-- These tests verify safety interlocks and basic functionality before patient treatments.
-- ============================================================================

INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, calculator_type, display_order, is_active)
VALUES
  -- Safety Interlocks
  ('brachytherapy_hdr', 'DBR1', 'daily', 'Door interlock/last person out - Verify radiation cannot be initiated with door open', 'Functional', NULL, 'Safety Interlocks', false, NULL, NULL, 1, true),
  ('brachytherapy_hdr', 'DBR2', 'daily', 'Treatment interrupt - Verify treatment can be paused and resumed correctly', 'Functional', NULL, 'Safety Interlocks', false, NULL, NULL, 2, true),
  ('brachytherapy_hdr', 'DBR3', 'daily', 'Emergency off (console) - Test console emergency stop button functionality', 'Functional', NULL, 'Safety Interlocks', false, NULL, NULL, 3, true),

  -- Radiation Safety
  ('brachytherapy_hdr', 'DBR4', 'daily', 'Room radiation monitor(s) - Verify area monitors respond to radiation', 'Functional', NULL, 'Radiation Safety', false, NULL, NULL, 4, true),
  ('brachytherapy_hdr', 'DBR5', 'daily', 'Room radiation warning lights - Verify warning lights illuminate during treatment', 'Functional', NULL, 'Radiation Safety', false, NULL, NULL, 5, true),

  -- Console Verification
  ('brachytherapy_hdr', 'DBR6', 'daily', 'Console displays - Verify treatment status indicator, correct date, time, source strength', 'Verify', NULL, 'Console Verification', true, '%', 'source_decay_check', 6, true),
  ('brachytherapy_hdr', 'DBR7', 'daily', 'Printer operation, Paper supply - If printer is used for treatment records', 'Functional', NULL, 'Console Verification', false, NULL, NULL, 7, true),

  -- Communication & Data Transfer
  ('brachytherapy_hdr', 'DBR8', 'daily', 'Data transfer from Planning Computer - Verify TPS to afterloader communication', 'Functional', NULL, 'Communication', false, NULL, NULL, 8, true),
  ('brachytherapy_hdr', 'DBR9', 'daily', 'Audio/Visual communication system - Test intercom and camera systems', 'Functional', NULL, 'Communication', false, NULL, NULL, 9, true),

  -- Source Verification (Measurement Tests)
  ('brachytherapy_hdr', 'DBR10', 'daily', 'Source positional accuracy - Verify using autoradiographs, ion chamber, or camera', '±1mm', '±2mm', 'Source Verification', true, 'mm', 'position_deviation', 10, true),
  ('brachytherapy_hdr', 'DBR11', 'daily', 'Dwell time accuracy - Compare with stopwatch (use sufficiently long dwell time)', '±1%', '±2%', 'Source Verification', true, '%', 'dwell_time', 11, true),

  -- PDR Specific
  ('brachytherapy_hdr', 'DBR12', 'daily', 'PDR Sequencing - Test required for PDR units only', 'Functional', NULL, 'PDR Specific', false, NULL, NULL, 12, true)
ON CONFLICT (equipment_type, test_id) DO UPDATE SET
  description = EXCLUDED.description,
  tolerance = EXCLUDED.tolerance,
  action_level = EXCLUDED.action_level,
  category = EXCLUDED.category,
  requires_measurement = EXCLUDED.requires_measurement,
  measurement_unit = EXCLUDED.measurement_unit,
  calculator_type = EXCLUDED.calculator_type,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- QUARTERLY QA TESTS (QBR1-QBR8)
-- Perform every 3 months OR at source replacement.
-- These tests verify source calibration, equipment integrity, and timer accuracy.
-- ============================================================================

INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, calculator_type, display_order, is_active)
VALUES
  -- Equipment Integrity
  ('brachytherapy_hdr', 'QBR1', 'quarterly', 'Mechanical integrity of applicators, guide tubes, connectors - Check for excessive wear, kinks, damage', 'Functional', NULL, 'Equipment Integrity', false, NULL, NULL, 1, true),

  -- Safety Systems
  ('brachytherapy_hdr', 'QBR2', 'quarterly', 'Emergency off (in room) - Test in-room emergency buttons, can test without exposing source', 'Functional', NULL, 'Safety Systems', false, NULL, NULL, 2, true),
  ('brachytherapy_hdr', 'QBR3', 'quarterly', 'Power failure recovery - Verify equipment safely terminates and resumes after power failure', 'Functional', NULL, 'Safety Systems', false, NULL, NULL, 3, true),

  -- Source Calibration (Measurement Tests)
  ('brachytherapy_hdr', 'QBR4', 'quarterly', 'Source strength calibration - Compare measured vs manufacturer value using SSDL-calibrated chamber', '±3%', '±5%', 'Source Calibration', true, '%', 'percentage_difference', 4, true),
  ('brachytherapy_hdr', 'QBR5', 'quarterly', 'Source positional accuracy - Deviation should be 0 mm at source replacement', '±1mm', '±2mm', 'Source Position', true, 'mm', 'position_deviation', 5, true),

  -- Timer Accuracy (Measurement Tests)
  ('brachytherapy_hdr', 'QBR6', 'quarterly', 'Dwell time accuracy - Compare with stopwatch over clinically relevant times', '±1%', '±2%', 'Timer Accuracy', true, '%', 'dwell_time', 6, true),
  ('brachytherapy_hdr', 'QBR7', 'quarterly', 'Timer linearity - Verify linearity over clinically relevant range', '±1%', '±2%', 'Timer Accuracy', true, '%', 'timer_linearity', 7, true),

  -- Documentation
  ('brachytherapy_hdr', 'QBR8', 'quarterly', 'Records - QC checks, maintenance, service calls complete and legible', 'Complete', NULL, 'Documentation', false, NULL, NULL, 8, true)
ON CONFLICT (equipment_type, test_id) DO UPDATE SET
  description = EXCLUDED.description,
  tolerance = EXCLUDED.tolerance,
  action_level = EXCLUDED.action_level,
  category = EXCLUDED.category,
  requires_measurement = EXCLUDED.requires_measurement,
  measurement_unit = EXCLUDED.measurement_unit,
  calculator_type = EXCLUDED.calculator_type,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- ANNUAL QA TESTS (ABR1-ABR5)
-- Perform once every 12 months (intervals between 10-14 months).
-- These tests ensure comprehensive review and independent verification.
-- ============================================================================

INSERT INTO qa_test_definitions (equipment_type, test_id, frequency, description, tolerance, action_level, category, requires_measurement, measurement_unit, calculator_type, display_order, is_active)
VALUES
  -- Transit Dose (Measurement Test)
  ('brachytherapy_hdr', 'ABR1', 'annual', 'Transit dose reproducibility - Verify transit dose or source speed between dwell positions using autoradiographs, ion chamber, or camera', '±1%', '±2%', 'Transit Dose', true, '%', 'transit_reproducibility', 1, true),

  -- Marker Accuracy (Measurement Test)
  ('brachytherapy_hdr', 'ABR2', 'annual', 'X-ray marker positional accuracy - Autoradiograph of source positions vs radiograph of applicator with x-ray markers, check for each applicator type', '±1mm', '±2mm', 'Marker Accuracy', true, 'mm', 'position_deviation', 2, true),

  -- Reviews and Audits
  ('brachytherapy_hdr', 'ABR3', 'annual', 'Review emergency response procedures - Review procedures for source fails to retract / exposed in room scenarios', 'Complete', NULL, 'Reviews', false, NULL, NULL, 3, true),
  ('brachytherapy_hdr', 'ABR4', 'annual', 'Independent quality control review - Second qualified medical physicist verifies implementation, analysis & interpretation of QC tests', 'Complete', NULL, 'Reviews', false, NULL, NULL, 4, true),

  -- Radiation Survey
  ('brachytherapy_hdr', 'ABR5', 'annual', 'Radiation survey around afterloader (source retracted) - Ensure source is fully retracted and check for leakage', 'Complete', NULL, 'Radiation Survey', true, 'µSv/h', NULL, 5, true)
ON CONFLICT (equipment_type, test_id) DO UPDATE SET
  description = EXCLUDED.description,
  tolerance = EXCLUDED.tolerance,
  action_level = EXCLUDED.action_level,
  category = EXCLUDED.category,
  requires_measurement = EXCLUDED.requires_measurement,
  measurement_unit = EXCLUDED.measurement_unit,
  calculator_type = EXCLUDED.calculator_type,
  display_order = EXCLUDED.display_order;
