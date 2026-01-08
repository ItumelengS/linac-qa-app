"use client";

import { useState, useEffect, useCallback } from "react";
import { CalculatorType, QAStatus, BaselineValues } from "@/types/database";

// Ir-192 half-life in days
const IR192_HALF_LIFE = 73.83;
const DECAY_CONSTANT = Math.LN2 / IR192_HALF_LIFE;

interface CalculatorProps {
  testId: string;
  tolerance?: string;
  actionLevel?: string;
  initialValues?: BaselineValues;
  onUpdate: (result: CalculatorResult) => void;
  onSaveBaseline?: (values: BaselineValues) => void;
}

export interface CalculatorResult {
  measurement?: number;
  baseline_value?: number;
  deviation?: number;
  status: QAStatus;
  notes: string;
  calculatorData?: Record<string, unknown>;
}

// Parse tolerance string to get numeric value
function parseTolerance(tolerance: string | undefined): number | null {
  if (!tolerance) return null;
  const match = tolerance.match(/[±]?\s*(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

// Determine status based on deviation and tolerances
function getStatus(
  absDeviation: number,
  tolerance: string | undefined,
  actionLevel: string | undefined
): { status: QAStatus; message: string } {
  const tol = parseTolerance(tolerance);
  const action = parseTolerance(actionLevel);

  if (tol === null) {
    return { status: "", message: "" };
  }

  if (absDeviation <= tol) {
    return { status: "pass", message: `Within ±${tol} tolerance` };
  }

  if (action !== null && absDeviation <= action) {
    return { status: "pass", message: `Within action level (investigate)` };
  }

  return { status: "fail", message: `Exceeds ${action !== null ? `±${action} action level` : `±${tol} tolerance`}` };
}

// ============================================================================
// Position Deviation Calculator
// Expected vs Measured position in mm
// ============================================================================
export function PositionDeviationCalculator({ testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline }: CalculatorProps) {
  const initVals = initialValues as { expected_position?: number } | undefined;
  const [expected, setExpected] = useState<string>(initVals?.expected_position?.toString() || "");
  const [measured, setMeasured] = useState<string>("");

  const calculate = useCallback(() => {
    const exp = parseFloat(expected);
    const meas = parseFloat(measured);

    if (isNaN(exp) || isNaN(meas)) {
      onUpdate({ status: "", notes: "", calculatorData: { expected, measured } });
      return;
    }

    const deviation = meas - exp;
    const absDeviation = Math.abs(deviation);
    const { status, message } = getStatus(absDeviation, tolerance, actionLevel);

    onUpdate({
      measurement: absDeviation,
      baseline_value: exp,
      deviation,
      status,
      notes: `Expected: ${exp}mm, Measured: ${meas}mm, Deviation: ${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}mm. ${message}`,
      calculatorData: { expected: exp, measured: meas },
    });
  }, [expected, measured, tolerance, actionLevel, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleSaveBaseline = () => {
    if (expected && onSaveBaseline) {
      onSaveBaseline({ expected_position: parseFloat(expected) });
    }
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500">Position Deviation Calculator</div>
        {onSaveBaseline && (
          <button
            type="button"
            onClick={handleSaveBaseline}
            disabled={!expected}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Expected
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Expected (mm)"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">vs</span>
        <input
          type="number"
          step="0.1"
          placeholder="Measured (mm)"
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">=</span>
        <span className="font-mono font-semibold text-blue-600">
          {expected && measured
            ? `${(parseFloat(measured) - parseFloat(expected)).toFixed(2)} mm`
            : "-- mm"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Percentage Difference Calculator
// Reference vs Measured with percentage output
// ============================================================================
export function PercentageDifferenceCalculator({ testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline }: CalculatorProps) {
  const initVals = initialValues as { reference_value?: number } | undefined;
  const [reference, setReference] = useState<string>(initVals?.reference_value?.toString() || "");
  const [measured, setMeasured] = useState<string>("");

  const calculate = useCallback(() => {
    const ref = parseFloat(reference);
    const meas = parseFloat(measured);

    if (isNaN(ref) || isNaN(meas) || ref === 0) {
      onUpdate({ status: "", notes: "", calculatorData: { reference, measured } });
      return;
    }

    const deviation = ((meas - ref) / ref) * 100;
    const absDeviation = Math.abs(deviation);
    const { status, message } = getStatus(absDeviation, tolerance, actionLevel);

    onUpdate({
      measurement: meas,
      baseline_value: ref,
      deviation,
      status,
      notes: `Reference: ${ref}, Measured: ${meas}, Difference: ${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%. ${message}`,
      calculatorData: { reference: ref, measured: meas },
    });
  }, [reference, measured, tolerance, actionLevel, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleSaveBaseline = () => {
    if (reference && onSaveBaseline) {
      onSaveBaseline({ reference_value: parseFloat(reference) });
    }
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500">Percentage Difference Calculator</div>
        {onSaveBaseline && (
          <button
            type="button"
            onClick={handleSaveBaseline}
            disabled={!reference}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Reference
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="0.001"
          placeholder="Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">vs</span>
        <input
          type="number"
          step="0.001"
          placeholder="Measured"
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">=</span>
        <span className="font-mono font-semibold text-blue-600">
          {reference && measured && parseFloat(reference) !== 0
            ? `${(((parseFloat(measured) - parseFloat(reference)) / parseFloat(reference)) * 100).toFixed(2)}%`
            : "--%"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Dwell Time Calculator
// Set time vs Measured time with percentage difference
// ============================================================================
export function DwellTimeCalculator({ testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline }: CalculatorProps) {
  const initVals = initialValues as { set_time?: number } | undefined;
  const [setTime, setSetTime] = useState<string>(initVals?.set_time?.toString() || "");
  const [measuredTime, setMeasuredTime] = useState<string>("");

  const calculate = useCallback(() => {
    const set = parseFloat(setTime);
    const meas = parseFloat(measuredTime);

    if (isNaN(set) || isNaN(meas) || set === 0) {
      onUpdate({ status: "", notes: "", calculatorData: { setTime, measuredTime } });
      return;
    }

    const deviation = ((meas - set) / set) * 100;
    const absDeviation = Math.abs(deviation);
    const { status, message } = getStatus(absDeviation, tolerance, actionLevel);

    onUpdate({
      measurement: meas,
      baseline_value: set,
      deviation,
      status,
      notes: `Set: ${set}s, Measured: ${meas}s, Deviation: ${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%. ${message}`,
      calculatorData: { setTime: set, measuredTime: meas },
    });
  }, [setTime, measuredTime, tolerance, actionLevel, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleSaveBaseline = () => {
    if (setTime && onSaveBaseline) {
      onSaveBaseline({ set_time: parseFloat(setTime) });
    }
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500">Dwell Time Accuracy</div>
        {onSaveBaseline && (
          <button
            type="button"
            onClick={handleSaveBaseline}
            disabled={!setTime}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Set Time
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Set (s)"
          value={setTime}
          onChange={(e) => setSetTime(e.target.value)}
          className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">vs</span>
        <input
          type="number"
          step="0.1"
          placeholder="Measured (s)"
          value={measuredTime}
          onChange={(e) => setMeasuredTime(e.target.value)}
          className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">=</span>
        <span className="font-mono font-semibold text-blue-600">
          {setTime && measuredTime && parseFloat(setTime) !== 0
            ? `${(((parseFloat(measuredTime) - parseFloat(setTime)) / parseFloat(setTime)) * 100).toFixed(2)}%`
            : "--%"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Timer Linearity Calculator
// Multiple time points, reports max deviation
// ============================================================================
export function TimerLinearityCalculator({ testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline }: CalculatorProps) {
  const initVals = initialValues as { time_points?: number[] } | undefined;
  const defaultPoints = initVals?.time_points || [10, 30, 60, 120];
  const [points, setPoints] = useState([
    { set: defaultPoints[0]?.toString() || "", measured: "" },
    { set: defaultPoints[1]?.toString() || "", measured: "" },
    { set: defaultPoints[2]?.toString() || "", measured: "" },
    { set: defaultPoints[3]?.toString() || "", measured: "" },
  ]);

  const updatePoint = (index: number, field: "set" | "measured", value: string) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setPoints(newPoints);
  };

  const calculate = useCallback(() => {
    const deviations: number[] = [];

    points.forEach((p) => {
      const set = parseFloat(p.set);
      const meas = parseFloat(p.measured);
      if (!isNaN(set) && !isNaN(meas) && set !== 0) {
        deviations.push(Math.abs(((meas - set) / set) * 100));
      }
    });

    if (deviations.length === 0) {
      onUpdate({ status: "", notes: "", calculatorData: { points } });
      return;
    }

    const maxDeviation = Math.max(...deviations);
    const { status, message } = getStatus(maxDeviation, tolerance, actionLevel);

    onUpdate({
      measurement: maxDeviation,
      deviation: maxDeviation,
      status,
      notes: `Max deviation: ${maxDeviation.toFixed(2)}%. ${message}`,
      calculatorData: { points, deviations },
    });
  }, [points, tolerance, actionLevel, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  // Calculate max deviation for display
  const deviations = points
    .filter((p) => p.set && p.measured && parseFloat(p.set) !== 0)
    .map((p) => Math.abs(((parseFloat(p.measured) - parseFloat(p.set)) / parseFloat(p.set)) * 100));
  const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : null;

  const placeholders = ["10", "30", "60", "120"];

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-xs font-medium text-gray-500 mb-2">Timer Linearity (Multiple Points)</div>
      <div className="grid grid-cols-4 gap-2 text-xs mb-1">
        <div className="font-medium">Set (s)</div>
        <div className="font-medium">Measured (s)</div>
        <div className="font-medium">Set (s)</div>
        <div className="font-medium">Measured (s)</div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <input type="number" step="0.1" placeholder={placeholders[0]} value={points[0].set} onChange={(e) => updatePoint(0, "set", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder="--" value={points[0].measured} onChange={(e) => updatePoint(0, "measured", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder={placeholders[1]} value={points[1].set} onChange={(e) => updatePoint(1, "set", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder="--" value={points[1].measured} onChange={(e) => updatePoint(1, "measured", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder={placeholders[2]} value={points[2].set} onChange={(e) => updatePoint(2, "set", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder="--" value={points[2].measured} onChange={(e) => updatePoint(2, "measured", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder={placeholders[3]} value={points[3].set} onChange={(e) => updatePoint(3, "set", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="number" step="0.1" placeholder="--" value={points[3].measured} onChange={(e) => updatePoint(3, "measured", e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      <div className="text-sm">
        Max deviation: <span className="font-mono font-semibold text-blue-600">{maxDeviation !== null ? `${maxDeviation.toFixed(2)}%` : "--%"}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Transit Reproducibility Calculator
// Multiple readings, calculates mean and max variation
// ============================================================================
export function TransitReproducibilityCalculator({ testId, tolerance, actionLevel, onUpdate }: CalculatorProps) {
  // This calculator doesn't need saved baselines - each measurement is fresh
  const [readings, setReadings] = useState<string[]>(["", "", ""]);

  const updateReading = (index: number, value: string) => {
    const newReadings = [...readings];
    newReadings[index] = value;
    setReadings(newReadings);
  };

  const calculate = useCallback(() => {
    const values = readings.map((r) => parseFloat(r)).filter((v) => !isNaN(v));

    if (values.length < 2) {
      onUpdate({ status: "", notes: "", calculatorData: { readings } });
      return;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const maxVariation = Math.max(...values.map((v) => Math.abs(((v - mean) / mean) * 100)));

    const { status, message } = getStatus(maxVariation, tolerance, actionLevel);

    onUpdate({
      measurement: mean,
      deviation: maxVariation,
      status,
      notes: `Mean: ${mean.toFixed(3)}, Max variation: ${maxVariation.toFixed(2)}%. ${message}`,
      calculatorData: { readings: values, mean },
    });
  }, [readings, tolerance, actionLevel, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  // Calculate for display
  const values = readings.map((r) => parseFloat(r)).filter((v) => !isNaN(v));
  const mean = values.length >= 2 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const maxVariation = mean !== null ? Math.max(...values.map((v) => Math.abs(((v - mean) / mean) * 100))) : null;

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-xs font-medium text-gray-500 mb-2">Transit Reproducibility (3 Readings)</div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {readings.map((r, i) => (
          <input
            key={i}
            type="number"
            step="0.001"
            placeholder={`Reading ${i + 1}`}
            value={r}
            onChange={(e) => updateReading(i, e.target.value)}
            className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ))}
      </div>
      <div className="text-sm flex gap-4">
        <span>Mean: <span className="font-mono">{mean !== null ? mean.toFixed(3) : "--"}</span></span>
        <span>Max variation: <span className="font-mono font-semibold text-blue-600">{maxVariation !== null ? `${maxVariation.toFixed(2)}%` : "--%"}</span></span>
      </div>
    </div>
  );
}

// ============================================================================
// Source Decay Check Calculator
// Ir-192 decay calculation with initial activity and calibration date
// ============================================================================
export function SourceDecayCheckCalculator({ testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline }: CalculatorProps) {
  const initVals = initialValues as { initial_activity?: number; calibration_date?: string; unit?: string } | undefined;
  const [initialActivity, setInitialActivity] = useState<string>(initVals?.initial_activity?.toString() || "");
  const [calibrationDate, setCalibrationDate] = useState<string>(initVals?.calibration_date || "");
  const [consoleReading, setConsoleReading] = useState<string>("");

  const calculate = useCallback(() => {
    const initial = parseFloat(initialActivity);
    const console_ = parseFloat(consoleReading);

    if (isNaN(initial) || !calibrationDate) {
      onUpdate({ status: "", notes: "", calculatorData: { initialActivity, calibrationDate, consoleReading } });
      return;
    }

    // Calculate expected activity today
    const calDate = new Date(calibrationDate);
    const today = new Date();
    const daysElapsed = (today.getTime() - calDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedActivity = initial * Math.exp(-DECAY_CONSTANT * daysElapsed);

    if (isNaN(console_)) {
      onUpdate({
        baseline_value: expectedActivity,
        status: "",
        notes: `Expected today: ${expectedActivity.toFixed(3)} Ci (${daysElapsed.toFixed(0)} days elapsed)`,
        calculatorData: { initialActivity: initial, calibrationDate, expectedActivity, daysElapsed },
      });
      return;
    }

    // Calculate difference
    const deviation = ((console_ - expectedActivity) / expectedActivity) * 100;
    const absDeviation = Math.abs(deviation);

    // For source decay, we typically want < 1-2% difference
    const status: QAStatus = absDeviation <= 2 ? "pass" : absDeviation <= 5 ? "pass" : "fail";
    const message = absDeviation <= 2 ? "Within acceptable range" : absDeviation <= 5 ? "Investigate difference" : "Significant deviation";

    onUpdate({
      measurement: console_,
      baseline_value: expectedActivity,
      deviation,
      status,
      notes: `Expected: ${expectedActivity.toFixed(3)} Ci, Console: ${console_} Ci, Diff: ${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%. ${message}`,
      calculatorData: { initialActivity: initial, calibrationDate, expectedActivity, consoleReading: console_, daysElapsed },
    });
  }, [initialActivity, calibrationDate, consoleReading, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  // Calculate for display
  const initial = parseFloat(initialActivity);
  const calDate = calibrationDate ? new Date(calibrationDate) : null;
  const today = new Date();
  const daysElapsed = calDate ? (today.getTime() - calDate.getTime()) / (1000 * 60 * 60 * 24) : null;
  const expectedActivity = !isNaN(initial) && daysElapsed !== null
    ? initial * Math.exp(-DECAY_CONSTANT * daysElapsed)
    : null;
  const console_ = parseFloat(consoleReading);
  const deviation = expectedActivity !== null && !isNaN(console_)
    ? ((console_ - expectedActivity) / expectedActivity) * 100
    : null;

  const handleSaveBaseline = () => {
    if (initialActivity && calibrationDate && onSaveBaseline) {
      onSaveBaseline({
        initial_activity: parseFloat(initialActivity),
        calibration_date: calibrationDate,
        unit: "Ci",
      });
    }
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500">Quick Source Strength Check (Ir-192)</div>
        {onSaveBaseline && (
          <button
            type="button"
            onClick={handleSaveBaseline}
            disabled={!initialActivity || !calibrationDate}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Source Data
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          type="number"
          step="0.01"
          placeholder="Initial (Ci)"
          value={initialActivity}
          onChange={(e) => setInitialActivity(e.target.value)}
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="date"
          value={calibrationDate}
          onChange={(e) => setCalibrationDate(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">Expected:</span>
        <span className="font-mono font-semibold text-amber-600">
          {expectedActivity !== null ? `${expectedActivity.toFixed(3)} Ci` : "-- Ci"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-500 text-sm">Console shows:</span>
        <input
          type="number"
          step="0.01"
          placeholder="Console (Ci)"
          value={consoleReading}
          onChange={(e) => setConsoleReading(e.target.value)}
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-gray-400">Diff:</span>
        <span className={`font-mono font-semibold ${deviation !== null && Math.abs(deviation) > 2 ? "text-red-600" : "text-blue-600"}`}>
          {deviation !== null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%` : "--%"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Calculator Factory - Returns appropriate calculator based on type
// ============================================================================
interface InlineCalculatorProps {
  calculatorType: CalculatorType;
  testId: string;
  tolerance?: string;
  actionLevel?: string;
  initialValues?: BaselineValues;
  onUpdate: (result: CalculatorResult) => void;
  onSaveBaseline?: (values: BaselineValues) => void;
}

export function InlineCalculator({ calculatorType, testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline }: InlineCalculatorProps) {
  const props = { testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline };

  switch (calculatorType) {
    case "position_deviation":
      return <PositionDeviationCalculator {...props} />;
    case "percentage_difference":
      return <PercentageDifferenceCalculator {...props} />;
    case "dwell_time":
      return <DwellTimeCalculator {...props} />;
    case "timer_linearity":
      return <TimerLinearityCalculator {...props} />;
    case "transit_reproducibility":
      return <TransitReproducibilityCalculator {...props} />;
    case "source_decay_check":
      return <SourceDecayCheckCalculator {...props} />;
    default:
      return null;
  }
}
