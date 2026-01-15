-- Add srak_calculation to the calculator_type check constraint
-- This enables the SRAK (Source Reference Air Kerma Rate) calculator for HDR brachytherapy

-- Drop the existing constraint
ALTER TABLE qa_test_definitions
DROP CONSTRAINT IF EXISTS qa_test_definitions_calculator_type_check;

-- Add the updated constraint with srak_calculation
ALTER TABLE qa_test_definitions
ADD CONSTRAINT qa_test_definitions_calculator_type_check CHECK (calculator_type IN (
  'position_deviation',      -- Expected vs Measured position (mm)
  'percentage_difference',   -- Reference vs Measured (%)
  'dwell_time',              -- Set time vs Measured time (%)
  'timer_linearity',         -- Multiple time points, max deviation
  'transit_reproducibility', -- Multiple readings, mean + variation
  'source_decay_check',      -- Source decay verification
  'srak_calculation'         -- Source Reference Air Kerma Rate (HDR brachytherapy)
));
