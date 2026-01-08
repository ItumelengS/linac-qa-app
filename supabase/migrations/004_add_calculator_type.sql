-- Add calculator_type column to qa_test_definitions
-- This specifies which inline calculator component to render for each test

ALTER TABLE qa_test_definitions
ADD COLUMN calculator_type TEXT CHECK (calculator_type IN (
  'position_deviation',      -- Expected vs Measured position (mm)
  'percentage_difference',   -- Reference vs Measured (%)
  'dwell_time',              -- Set time vs Measured time (%)
  'timer_linearity',         -- Multiple time points, max deviation
  'transit_reproducibility', -- Multiple readings, mean + variation
  'source_decay_check'       -- Source decay verification (initial, cal date, expected vs console)
));

COMMENT ON COLUMN qa_test_definitions.calculator_type IS 'Type of inline calculator to render for this test. NULL means no calculator.';
