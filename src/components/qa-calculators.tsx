"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [showStopwatch, setShowStopwatch] = useState(false);

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

  const handleTimeCapture = (timeInSeconds: number) => {
    setMeasuredTime(timeInSeconds.toFixed(2));
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-500">Dwell Time Accuracy</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowStopwatch(!showStopwatch)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showStopwatch
                ? "bg-gray-800 text-green-400"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {showStopwatch ? "Hide Stopwatch" : "Show Stopwatch"}
          </button>
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
      </div>

      {/* Inline Stopwatch */}
      {showStopwatch && (
        <div className="mb-3">
          <InlineStopwatch onTimeCapture={handleTimeCapture} />
        </div>
      )}

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

// Compact inline stopwatch for embedding in calculators
function InlineStopwatch({ onTimeCapture }: { onTimeCapture: (time: number) => void }) {
  const [time, setTime] = useState(0); // centiseconds
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 10);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (cs: number) => {
    const minutes = Math.floor(cs / 6000);
    const seconds = Math.floor((cs % 6000) / 100);
    const centis = cs % 100;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-3 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-2xl font-bold tracking-wider text-green-400">
          {formatTime(time)}
          <span className="text-xs text-gray-400 ml-2">({(time / 100).toFixed(2)}s)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isRunning ? "Stop" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => { setIsRunning(false); setTime(0); }}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onTimeCapture(time / 100)}
            disabled={time === 0}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
          >
            Use Time
          </button>
        </div>
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
// SRAK Calculator (Source Reference Air Kerma Rate)
// HDR Brachytherapy source strength verification using well chamber
// Sk = M × Nsk × kTP × kelec × k_applicator
// Includes sweet spot determination (coarse + fine scan)
// ============================================================================
interface SRAKCalculatorProps extends CalculatorProps {
  equipmentId?: string;
  equipmentName?: string;
  organizationName?: string;
  onSaveSRAKReport?: (data: SRAKReportData) => Promise<void>;
}

export interface SRAKReportData {
  equipment_id: string;
  source_serial?: string;
  source_radionuclide?: string;
  certificate_srak: number;
  certificate_date: string;
  certificate_number?: string;
  chamber_model?: string;
  chamber_serial?: string;
  chamber_factor_nsk: number;
  electrometer_model?: string;
  electrometer_serial?: string;
  electrometer_factor: number;
  applicator_factor: number;
  applicator_type?: string;
  source_factor: number;
  source_model?: string;
  sweet_spot_position?: number;
  sweet_spot_method?: string;
  measured_temperature?: number;
  measured_pressure?: number;
  reference_temperature: number;
  reference_pressure: number;
  reading_1?: number;
  reading_2?: number;
  reading_3?: number;
  measurement_date: string;
  notes?: string;
}

export function SRAKCalculator({ testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline, equipmentId, equipmentName, organizationName, onSaveSRAKReport }: SRAKCalculatorProps) {
  const initVals = initialValues as {
    chamber_factor_nsk?: number;
    electrometer_factor?: number;
    applicator_factor?: number;
    applicator_type?: string;
    source_factor?: number;
    source_model?: string;
    source_radionuclide?: string;
    reference_temperature?: number;
    reference_pressure?: number;
    certificate_srak?: number;
    certificate_date?: string;
    sweet_spot_position?: number;
    chamber_model?: string;
    chamber_serial?: string;
    electrometer_model?: string;
    electrometer_serial?: string;
    source_serial?: string;
    certificate_number?: string;
  } | undefined;

  // Sweet spot determination state
  const [showSweetSpot, setShowSweetSpot] = useState<boolean>(false);
  const [sweetSpotPhase, setSweetSpotPhase] = useState<"coarse" | "fine" | "complete">("coarse");
  const [coarseStartPos, setCoarseStartPos] = useState<string>("130");
  const [coarseNumStops, setCoarseNumStops] = useState<string>("9");
  const [coarseStepSize, setCoarseStepSize] = useState<string>("5");
  const [fineNumStops, setFineNumStops] = useState<string>("11");
  const [fineStepSize, setFineStepSize] = useState<string>("1");
  const [coarseReadings, setCoarseReadings] = useState<{ position: number; reading: string }[]>([]);
  const [fineReadings, setFineReadings] = useState<{ position: number; reading: string }[]>([]);
  const [sweetSpotPosition, setSweetSpotPosition] = useState<string>(initVals?.sweet_spot_position?.toString() || "");

  // Initialize coarse positions based on user-defined parameters
  const initializeCoarsePositions = useCallback(() => {
    const start = parseFloat(coarseStartPos) || 130;
    const numStops = parseInt(coarseNumStops) || 9;
    const stepSize = parseFloat(coarseStepSize) || 5;
    const positions = [];
    for (let i = 0; i < numStops; i++) {
      positions.push({ position: start + i * stepSize, reading: "" });
    }
    setCoarseReadings(positions);
    setSweetSpotPhase("coarse");
  }, [coarseStartPos, coarseNumStops, coarseStepSize]);

  // Initialize fine positions based on user-defined parameters, centered around coarse max
  const initializeFinePositions = useCallback((centerPos: number) => {
    const numStops = parseInt(fineNumStops) || 11;
    const stepSize = parseFloat(fineStepSize) || 1;
    const positions = [];
    const halfRange = Math.floor(numStops / 2);
    for (let i = -halfRange; i <= halfRange; i++) {
      if (positions.length < numStops) {
        positions.push({ position: centerPos + i * stepSize, reading: "" });
      }
    }
    setFineReadings(positions);
    setSweetSpotPhase("fine");
  }, [fineNumStops, fineStepSize]);

  // Find max reading position from array
  const findMaxPosition = (readings: { position: number; reading: string }[]): number | null => {
    let maxReading = -Infinity;
    let maxPos: number | null = null;
    readings.forEach((r) => {
      const val = parseFloat(r.reading);
      if (!isNaN(val) && val > maxReading) {
        maxReading = val;
        maxPos = r.position;
      }
    });
    return maxPos;
  };

  // Update coarse reading
  const updateCoarseReading = (index: number, value: string) => {
    const newReadings = [...coarseReadings];
    newReadings[index] = { ...newReadings[index], reading: value };
    setCoarseReadings(newReadings);
  };

  // Update fine reading
  const updateFineReading = (index: number, value: string) => {
    const newReadings = [...fineReadings];
    newReadings[index] = { ...newReadings[index], reading: value };
    setFineReadings(newReadings);
  };

  // Complete coarse phase and move to fine
  const completeCoarsePhase = () => {
    const maxPos = findMaxPosition(coarseReadings);
    if (maxPos !== null) {
      initializeFinePositions(maxPos);
    }
  };

  // Complete fine phase and set sweet spot
  const completeFinePhase = () => {
    const maxPos = findMaxPosition(fineReadings);
    if (maxPos !== null) {
      setSweetSpotPosition(maxPos.toString());
      setSweetSpotPhase("complete");
    }
  };

  // Baseline values (chamber/certificate data)
  const [chamberNsk, setChamberNsk] = useState<string>(initVals?.chamber_factor_nsk?.toString() || "");
  const [electrometerFactor, setElectrometerFactor] = useState<string>(initVals?.electrometer_factor?.toString() || "1.000");
  const [applicatorFactor, setApplicatorFactor] = useState<string>(initVals?.applicator_factor?.toString() || "1.029");
  const [refTemp, setRefTemp] = useState<string>(initVals?.reference_temperature?.toString() || "20");
  const [refPressure, setRefPressure] = useState<string>(initVals?.reference_pressure?.toString() || "101.325");
  const [certSRAK, setCertSRAK] = useState<string>(initVals?.certificate_srak?.toString() || "");
  const [certDate, setCertDate] = useState<string>(initVals?.certificate_date || "");

  // Source and instrument identification
  const [sourceSerial, setSourceSerial] = useState<string>(initVals?.source_serial || "");
  const [certNumber, setCertNumber] = useState<string>(initVals?.certificate_number || "");
  const [chamberModel, setChamberModel] = useState<string>(initVals?.chamber_model || "");
  const [chamberSerial, setChamberSerial] = useState<string>(initVals?.chamber_serial || "");
  const [electrometerModel, setElectrometerModel] = useState<string>(initVals?.electrometer_model || "");
  const [electrometerSerial, setElectrometerSerial] = useState<string>(initVals?.electrometer_serial || "");
  const [applicatorType, setApplicatorType] = useState<string>(initVals?.applicator_type || "");
  const [sourceFactor, setSourceFactor] = useState<string>(initVals?.source_factor?.toString() || "1.000");
  const [sourceModel, setSourceModel] = useState<string>(initVals?.source_model || "");
  const [sourceRadionuclide, setSourceRadionuclide] = useState<string>(initVals?.source_radionuclide || "Ir-192");

  // Save report state
  const [savingReport, setSavingReport] = useState(false);
  const [reportSaveMessage, setReportSaveMessage] = useState<string | null>(null);
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Measurement values (3 readings at sweet spot)
  const [readings, setReadings] = useState<string[]>(["", "", ""]);
  const [measuredTemp, setMeasuredTemp] = useState<string>("");
  const [measuredPressure, setMeasuredPressure] = useState<string>("");

  const updateReading = (index: number, value: string) => {
    const newReadings = [...readings];
    newReadings[index] = value;
    setReadings(newReadings);
  };

  const calculate = useCallback(() => {
    const nsk = parseFloat(chamberNsk);
    const kelec = parseFloat(electrometerFactor);
    const kApp = parseFloat(applicatorFactor) || 1.0; // Applicator correction factor
    const kSource = parseFloat(sourceFactor) || 1.0; // Source correction factor (e.g., Gammamed = 0.9961)
    const T0 = parseFloat(refTemp);
    const P0 = parseFloat(refPressure);
    const certValue = parseFloat(certSRAK);
    const T = parseFloat(measuredTemp);
    const P = parseFloat(measuredPressure);

    // Parse readings and calculate mean
    const readingValues = readings.map(r => parseFloat(r)).filter(v => !isNaN(v));

    if (readingValues.length === 0 || isNaN(nsk)) {
      onUpdate({ status: "", notes: "", calculatorData: { readings, chamberNsk, measuredTemp, measuredPressure } });
      return;
    }

    const meanReading = readingValues.reduce((a, b) => a + b, 0) / readingValues.length;

    // Calculate kTP correction factor
    let kTP = 1.0;
    if (!isNaN(T) && !isNaN(P) && !isNaN(T0) && !isNaN(P0) && P !== 0) {
      kTP = ((273.15 + T) / (273.15 + T0)) * (P0 / P);
    }

    // Calculate measured SRAK: Sk = M × Nsk × kTP × kelec × k_applicator × k_source
    const kElec = isNaN(kelec) ? 1.0 : kelec;
    const measuredSRAK = meanReading * nsk * kTP * kElec * kApp * kSource;

    // If no certificate data, just show measured value
    if (isNaN(certValue) || !certDate) {
      const sweetSpotInfo = sweetSpotPosition ? ` [Sweet spot: ${sweetSpotPosition}mm]` : "";
      onUpdate({
        measurement: measuredSRAK,
        status: "",
        notes: `Measured SRAK: ${measuredSRAK.toFixed(1)} μGy·m²·h⁻¹ (Mean M: ${meanReading.toFixed(2)} nA, kTP: ${kTP.toFixed(4)}, k_app: ${kApp.toFixed(3)}, k_src: ${kSource.toFixed(4)})${sweetSpotInfo}`,
        calculatorData: { readings: readingValues, meanReading, nsk, kTP, kElec, kApp, kSource, measuredSRAK, sweetSpotPosition: sweetSpotPosition ? parseFloat(sweetSpotPosition) : undefined },
      });
      return;
    }

    // Calculate decayed certificate value (Ir-192 half-life = 73.83 days)
    const certDateObj = new Date(certDate);
    const today = new Date();
    const daysElapsed = (today.getTime() - certDateObj.getTime()) / (1000 * 60 * 60 * 24);
    const decayedCert = certValue * Math.exp(-DECAY_CONSTANT * daysElapsed);

    // Calculate percentage difference
    const deviation = ((measuredSRAK - decayedCert) / decayedCert) * 100;
    const absDeviation = Math.abs(deviation);

    // Determine status based on tolerance (default ±3%, action level ±5%)
    const { status, message } = getStatus(absDeviation, tolerance || "±3%", actionLevel || "±5%");

    const sweetSpotNote = sweetSpotPosition ? ` [Sweet spot: ${sweetSpotPosition}mm]` : "";
    onUpdate({
      measurement: measuredSRAK,
      baseline_value: decayedCert,
      deviation,
      status,
      notes: `Measured: ${measuredSRAK.toFixed(1)} μGy·m²·h⁻¹, Expected: ${decayedCert.toFixed(1)} μGy·m²·h⁻¹ (${daysElapsed.toFixed(0)}d decay), Diff: ${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%.${sweetSpotNote} ${message}`,
      calculatorData: {
        readings: readingValues,
        meanReading,
        nsk,
        kTP,
        kElec,
        kApp,
        kSource,
        measuredSRAK,
        decayedCert,
        daysElapsed,
        certValue,
        certDate,
        sweetSpotPosition: sweetSpotPosition ? parseFloat(sweetSpotPosition) : undefined,
      },
    });
  }, [readings, chamberNsk, electrometerFactor, applicatorFactor, sourceFactor, refTemp, refPressure, certSRAK, certDate, measuredTemp, measuredPressure, sweetSpotPosition, tolerance, actionLevel, onUpdate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  // Calculate values for display
  const readingValues = readings.map(r => parseFloat(r)).filter(v => !isNaN(v));
  const meanReading = readingValues.length > 0 ? readingValues.reduce((a, b) => a + b, 0) / readingValues.length : null;

  const nsk = parseFloat(chamberNsk);
  const kApp = parseFloat(applicatorFactor) || 1.0;
  const kSrc = parseFloat(sourceFactor) || 1.0;
  const T = parseFloat(measuredTemp);
  const P = parseFloat(measuredPressure);
  const T0 = parseFloat(refTemp);
  const P0 = parseFloat(refPressure);
  const kelec = parseFloat(electrometerFactor) || 1.0;

  let kTP: number | null = null;
  if (!isNaN(T) && !isNaN(P) && !isNaN(T0) && !isNaN(P0) && P !== 0) {
    kTP = ((273.15 + T) / (273.15 + T0)) * (P0 / P);
  }

  const measuredSRAK = meanReading !== null && !isNaN(nsk) && kTP !== null
    ? meanReading * nsk * kTP * kelec * kApp * kSrc
    : null;

  const certValue = parseFloat(certSRAK);
  const certDateObj = certDate ? new Date(certDate) : null;
  const today = new Date();
  const daysElapsed = certDateObj ? (today.getTime() - certDateObj.getTime()) / (1000 * 60 * 60 * 24) : null;
  const decayedCert = !isNaN(certValue) && daysElapsed !== null
    ? certValue * Math.exp(-DECAY_CONSTANT * daysElapsed)
    : null;

  const deviation = measuredSRAK !== null && decayedCert !== null
    ? ((measuredSRAK - decayedCert) / decayedCert) * 100
    : null;

  const handleSaveBaseline = () => {
    if (chamberNsk && certSRAK && certDate && onSaveBaseline) {
      onSaveBaseline({
        chamber_factor_nsk: parseFloat(chamberNsk),
        electrometer_factor: parseFloat(electrometerFactor) || 1.0,
        applicator_factor: parseFloat(applicatorFactor) || 1.0,
        applicator_type: applicatorType || undefined,
        source_factor: parseFloat(sourceFactor) || 1.0,
        source_model: sourceModel || undefined,
        source_radionuclide: sourceRadionuclide || "Ir-192",
        reference_temperature: parseFloat(refTemp) || 20,
        reference_pressure: parseFloat(refPressure) || 101.325,
        certificate_srak: parseFloat(certSRAK),
        certificate_date: certDate,
        sweet_spot_position: sweetSpotPosition ? parseFloat(sweetSpotPosition) : undefined,
        chamber_model: chamberModel || undefined,
        chamber_serial: chamberSerial || undefined,
        electrometer_model: electrometerModel || undefined,
        electrometer_serial: electrometerSerial || undefined,
        source_serial: sourceSerial || undefined,
        certificate_number: certNumber || undefined,
      });
    }
  };

  const handleSaveSRAKReport = async () => {
    if (!onSaveSRAKReport || !equipmentId || !chamberNsk || !certSRAK || !certDate) return;

    setSavingReport(true);
    setReportSaveMessage(null);

    try {
      const reportData: SRAKReportData = {
        equipment_id: equipmentId,
        source_serial: sourceSerial || undefined,
        source_radionuclide: sourceRadionuclide || "Ir-192",
        certificate_srak: parseFloat(certSRAK),
        certificate_date: certDate,
        certificate_number: certNumber || undefined,
        chamber_model: chamberModel || undefined,
        chamber_serial: chamberSerial || undefined,
        chamber_factor_nsk: parseFloat(chamberNsk),
        electrometer_model: electrometerModel || undefined,
        electrometer_serial: electrometerSerial || undefined,
        electrometer_factor: parseFloat(electrometerFactor) || 1.0,
        applicator_factor: parseFloat(applicatorFactor) || 1.0,
        applicator_type: applicatorType || undefined,
        source_factor: parseFloat(sourceFactor) || 1.0,
        source_model: sourceModel || undefined,
        sweet_spot_position: sweetSpotPosition ? parseFloat(sweetSpotPosition) : undefined,
        sweet_spot_method: sweetSpotPhase === "complete" ? "coarse_fine_scan" : sweetSpotPosition ? "manual" : undefined,
        measured_temperature: parseFloat(measuredTemp) || undefined,
        measured_pressure: parseFloat(measuredPressure) || undefined,
        reference_temperature: parseFloat(refTemp) || 20,
        reference_pressure: parseFloat(refPressure) || 101.325,
        reading_1: parseFloat(readings[0]) || undefined,
        reading_2: parseFloat(readings[1]) || undefined,
        reading_3: parseFloat(readings[2]) || undefined,
        measurement_date: new Date().toISOString().split("T")[0],
      };

      await onSaveSRAKReport(reportData);
      setReportSaveMessage("SRAK report saved successfully!");
      setTimeout(() => setReportSaveMessage(null), 3000);
    } catch (error) {
      console.error("Error saving SRAK report:", error);
      setReportSaveMessage("Failed to save SRAK report");
    } finally {
      setSavingReport(false);
    }
  };

  // Get max values for highlighting
  const coarseMaxPos = findMaxPosition(coarseReadings);
  const fineMaxPos = findMaxPosition(fineReadings);

  // Print report handler
  const handlePrintReport = () => {
    setShowPrintReport(true);
    setTimeout(() => window.print(), 100);
  };

  // Get result status for print report
  const getResultStatus = () => {
    if (deviation === null) return { text: "Incomplete", color: "gray" };
    const absDeviation = Math.abs(deviation);
    if (absDeviation <= 3) return { text: "PASS", color: "green" };
    if (absDeviation <= 5) return { text: "ACTION REQUIRED", color: "yellow" };
    return { text: "FAIL", color: "red" };
  };

  return (
    <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="text-xs font-medium text-gray-500">SRAK Calculator (Well Chamber)</div>
        {onSaveBaseline && (
          <button
            type="button"
            onClick={handleSaveBaseline}
            disabled={!chamberNsk || !certSRAK || !certDate}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            Save Chamber/Cert Data
          </button>
        )}
      </div>

      {/* Sweet Spot Determination (Collapsible) */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => {
            setShowSweetSpot(!showSweetSpot);
            if (!showSweetSpot && coarseReadings.length === 0) {
              initializeCoarsePositions();
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-900"
        >
          <span className={`transform transition-transform ${showSweetSpot ? "rotate-90" : ""}`}>▶</span>
          Sweet Spot Determination
          {sweetSpotPosition && (
            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
              {sweetSpotPosition} mm
            </span>
          )}
        </button>

        {showSweetSpot && (
          <div className="mt-2 p-2 sm:p-3 bg-purple-50 rounded border border-purple-200">
            {/* Coarse Scan Phase */}
            {sweetSpotPhase === "coarse" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-medium text-purple-700">Phase 1: Coarse Scan</div>
                  <button
                    type="button"
                    onClick={initializeCoarsePositions}
                    className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300"
                  >
                    Apply / Reset
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-purple-100 rounded">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Start:</label>
                    <input
                      type="number"
                      value={coarseStartPos}
                      onChange={(e) => setCoarseStartPos(e.target.value)}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-500">mm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Stops:</label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={coarseNumStops}
                      onChange={(e) => setCoarseNumStops(e.target.value)}
                      className="w-14 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Step:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={coarseStepSize}
                      onChange={(e) => setCoarseStepSize(e.target.value)}
                      className="w-14 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-500">mm</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {coarseReadings.map((r, i) => (
                    <div key={i} className={`flex items-center gap-1 ${r.position === coarseMaxPos ? "bg-yellow-100 rounded px-1" : ""}`}>
                      <span className="text-xs text-gray-500 w-10 sm:w-12">{r.position}:</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="nA"
                        value={r.reading}
                        onChange={(e) => updateCoarseReading(i, e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      {r.position === coarseMaxPos && <span className="text-yellow-600 text-xs">★</span>}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">
                    {coarseMaxPos !== null ? `Max at ${coarseMaxPos}mm` : "Enter readings to find max"}
                  </div>
                  <button
                    type="button"
                    onClick={completeCoarsePhase}
                    disabled={coarseMaxPos === null}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    Proceed to Fine Scan →
                  </button>
                </div>
              </div>
            )}

            {/* Fine Scan Phase */}
            {sweetSpotPhase === "fine" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-medium text-purple-700">Phase 2: Fine Scan (around {coarseMaxPos}mm)</div>
                  <button
                    type="button"
                    onClick={() => setSweetSpotPhase("coarse")}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 self-start sm:self-auto"
                  >
                    ← Back
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-purple-100 rounded">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Stops:</label>
                    <input
                      type="number"
                      min="3"
                      max="21"
                      value={fineNumStops}
                      onChange={(e) => {
                        setFineNumStops(e.target.value);
                        if (coarseMaxPos !== null) {
                          initializeFinePositions(coarseMaxPos);
                        }
                      }}
                      className="w-14 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600">Step:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={fineStepSize}
                      onChange={(e) => {
                        setFineStepSize(e.target.value);
                        if (coarseMaxPos !== null) {
                          initializeFinePositions(coarseMaxPos);
                        }
                      }}
                      className="w-14 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-500">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => coarseMaxPos !== null && initializeFinePositions(coarseMaxPos)}
                    className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300"
                  >
                    Apply
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {fineReadings.map((r, i) => (
                    <div key={i} className={`flex items-center gap-1 ${r.position === fineMaxPos ? "bg-green-100 rounded px-1" : ""}`}>
                      <span className="text-xs text-gray-500 w-10 sm:w-12">{r.position}:</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="nA"
                        value={r.reading}
                        onChange={(e) => updateFineReading(i, e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      {r.position === fineMaxPos && <span className="text-green-600 text-xs">★</span>}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">
                    {fineMaxPos !== null ? `Sweet spot at ${fineMaxPos}mm` : "Enter readings to find sweet spot"}
                  </div>
                  <button
                    type="button"
                    onClick={completeFinePhase}
                    disabled={fineMaxPos === null}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    Set Sweet Spot ✓
                  </button>
                </div>
              </div>
            )}

            {/* Complete - show summary */}
            {sweetSpotPhase === "complete" && (
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-sm text-green-700">
                    ✓ Sweet spot: <span className="font-semibold">{sweetSpotPosition} mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      initializeCoarsePositions();
                    }}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Re-measure
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual sweet spot entry if not using determination */}
        {!showSweetSpot && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500">Or enter known position:</label>
            <input
              type="number"
              step="1"
              placeholder="mm"
              value={sweetSpotPosition}
              onChange={(e) => setSweetSpotPosition(e.target.value)}
              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <span className="text-xs text-gray-400">mm</span>
          </div>
        )}
      </div>

      {/* Source Information */}
      <div className="mb-3 p-2 bg-amber-50 rounded border border-amber-200">
        <div className="text-xs font-medium text-amber-700 mb-2">Source Information</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500">Radionuclide</label>
            <select
              value={sourceRadionuclide}
              onChange={(e) => setSourceRadionuclide(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Ir-192">Ir-192</option>
              <option value="Co-60">Co-60</option>
              <option value="Cs-137">Cs-137</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Source Model/Type</label>
            <input
              type="text"
              placeholder="e.g., Gammamed, microSelectron"
              value={sourceModel}
              onChange={(e) => setSourceModel(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">k_source (correction)</label>
            <input
              type="number"
              step="0.0001"
              placeholder="1.0000"
              value={sourceFactor}
              onChange={(e) => setSourceFactor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Source Serial Number</label>
            <input
              type="text"
              placeholder="Source S/N"
              value={sourceSerial}
              onChange={(e) => setSourceSerial(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Certificate Number</label>
            <input
              type="text"
              placeholder="Cert #"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <p className="text-xs text-amber-600 mt-2">
          Common k_source values: Gammamed = 0.9961, microSelectron = 1.0000
        </p>
      </div>

      {/* Chamber & Certificate Data (Baseline) */}
      <div className="mb-3 p-2 bg-white rounded border border-gray-100">
        <div className="text-xs font-medium text-gray-400 mb-2">Chamber & Certificate Data</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500">Nsk (μGy·m²·h⁻¹·nA⁻¹)</label>
            <input
              type="number"
              step="0.001"
              placeholder="Chamber factor"
              value={chamberNsk}
              onChange={(e) => setChamberNsk(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">k_elec</label>
            <input
              type="number"
              step="0.001"
              placeholder="1.000"
              value={electrometerFactor}
              onChange={(e) => setElectrometerFactor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">k_applicator</label>
            <input
              type="number"
              step="0.001"
              placeholder="1.029"
              value={applicatorFactor}
              onChange={(e) => setApplicatorFactor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500">Chamber Model</label>
            <input
              type="text"
              placeholder="e.g., HDR 1000+"
              value={chamberModel}
              onChange={(e) => setChamberModel(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Chamber Serial</label>
            <input
              type="text"
              placeholder="S/N"
              value={chamberSerial}
              onChange={(e) => setChamberSerial(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500">Electrometer Model</label>
            <input
              type="text"
              placeholder="e.g., MAX 4000"
              value={electrometerModel}
              onChange={(e) => setElectrometerModel(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Electrometer Serial</label>
            <input
              type="text"
              placeholder="S/N"
              value={electrometerSerial}
              onChange={(e) => setElectrometerSerial(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-gray-500">Cert SRAK (μGy·m²·h⁻¹)</label>
            <input
              type="number"
              step="1"
              placeholder="Certificate value"
              value={certSRAK}
              onChange={(e) => setCertSRAK(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Cert Date</label>
            <input
              type="date"
              value={certDate}
              onChange={(e) => setCertDate(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Ref Temp T₀ (°C)</label>
            <input
              type="number"
              step="0.1"
              placeholder="20"
              value={refTemp}
              onChange={(e) => setRefTemp(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Ref Pressure P₀ (kPa)</label>
            <input
              type="number"
              step="0.001"
              placeholder="101.325"
              value={refPressure}
              onChange={(e) => setRefPressure(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Measurement Inputs */}
      <div className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <div className="text-xs font-medium text-gray-400">Measurements at Sweet Spot</div>
          {sweetSpotPosition && (
            <div className="text-xs text-purple-600 font-medium">
              Position: {sweetSpotPosition} mm
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {readings.map((r, i) => (
            <div key={i}>
              <label className="text-xs text-gray-500">M{i + 1}</label>
              <input
                type="number"
                step="0.01"
                placeholder="nA"
                value={r}
                onChange={(e) => updateReading(i, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Temp T (°C)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Temp"
              value={measuredTemp}
              onChange={(e) => setMeasuredTemp(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Pressure P (kPa)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Press"
              value={measuredPressure}
              onChange={(e) => setMeasuredPressure(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-2 sm:p-3 bg-blue-50 rounded border border-blue-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs sm:text-sm">
          <div>Mean M: <span className="font-mono">{meanReading !== null ? `${meanReading.toFixed(2)} nA` : "--"}</span></div>
          <div>k_TP: <span className="font-mono">{kTP !== null ? kTP.toFixed(4) : "--"}</span></div>
          <div>k_app: <span className="font-mono">{kApp.toFixed(4)}</span></div>
          <div>k_src: <span className="font-mono">{kSrc.toFixed(4)}</span></div>
          <div>Measured S_k: <span className="font-mono font-semibold text-blue-600">{measuredSRAK !== null ? `${measuredSRAK.toFixed(1)}` : "--"}</span></div>
          <div>Expected S_k: <span className="font-mono text-amber-600">{decayedCert !== null ? `${decayedCert.toFixed(1)}` : "--"}</span></div>
          <div className="col-span-2 sm:col-span-3 pt-1 border-t border-blue-200 mt-1">
            <span className="font-medium">Difference:</span> <span className={`font-mono font-bold text-base ${deviation !== null && Math.abs(deviation) > 3 ? "text-red-600" : "text-green-600"}`}>
              {deviation !== null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%` : "--%"}
            </span>
            {daysElapsed !== null && <span className="text-xs text-gray-500 ml-2 block sm:inline">({daysElapsed.toFixed(0)}d since cal)</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex flex-wrap items-center gap-2">
            {/* Print Report Button - always available */}
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={!measuredSRAK}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>

            {/* Save SRAK Report Button */}
            {onSaveSRAKReport && equipmentId && (
              <button
                type="button"
                onClick={handleSaveSRAKReport}
                disabled={savingReport || !measuredSRAK || !chamberNsk || !certSRAK || !certDate}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingReport ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save to Database
                  </>
                )}
              </button>
            )}

            {reportSaveMessage && (
              <span className={`text-sm ${reportSaveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {reportSaveMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Print Report Modal */}
      {showPrintReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:relative print:bg-transparent print:p-0">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:overflow-visible">
            {/* Report Header */}
            <div className="p-6 border-b-2 border-black print:p-4">
              <div className="flex justify-between items-start">
                <div>
                  {organizationName && (
                    <div className="text-lg font-bold text-gray-800 mb-1">{organizationName}</div>
                  )}
                  <h1 className="text-2xl font-bold text-gray-900">SRAK Measurement Report</h1>
                  <p className="text-gray-600">Source Reference Air Kerma Rate Verification</p>
                  {equipmentName && (
                    <p className="text-gray-700 font-medium mt-1">Equipment: {equipmentName}</p>
                  )}
                </div>
                <div className="text-right print:hidden">
                  <button
                    onClick={() => setShowPrintReport(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">{new Date().toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <span className="ml-2 font-medium">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    getResultStatus().color === "green" ? "bg-green-100 text-green-800" :
                    getResultStatus().color === "yellow" ? "bg-yellow-100 text-yellow-800" :
                    getResultStatus().color === "red" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {getResultStatus().text}
                  </span>
                </div>
              </div>
            </div>

            {/* Source Information */}
            <div className="p-4 bg-amber-50 border-b">
              <h2 className="text-sm font-bold text-amber-800 mb-2">SOURCE INFORMATION</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Radionuclide:</span>
                  <div className="font-medium">{sourceRadionuclide || "Ir-192"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Source Model:</span>
                  <div className="font-medium">{sourceModel || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Source S/N:</span>
                  <div className="font-medium">{sourceSerial || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">k<sub>source</sub>:</span>
                  <div className="font-mono font-medium">{sourceFactor || "1.0000"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Certificate #:</span>
                  <div className="font-medium">{certNumber || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Cert Date:</span>
                  <div className="font-medium">{certDate ? new Date(certDate).toLocaleDateString() : "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Certificate SRAK:</span>
                  <div className="font-mono font-medium">{certSRAK || "-"} μGy·m²·h⁻¹</div>
                </div>
                <div>
                  <span className="text-gray-500">Days Elapsed:</span>
                  <div className="font-medium">{daysElapsed !== null ? daysElapsed.toFixed(0) : "-"}</div>
                </div>
                <div className="sm:col-span-4">
                  <span className="text-gray-500">Expected SRAK (decayed):</span>
                  <div className="font-mono font-bold text-amber-700">{decayedCert !== null ? decayedCert.toFixed(1) : "-"} μGy·m²·h⁻¹</div>
                </div>
              </div>
            </div>

            {/* Instrumentation */}
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-700 mb-2">INSTRUMENTATION</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Well Chamber:</span>
                  <div className="font-medium">{chamberModel || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Chamber S/N:</span>
                  <div className="font-medium">{chamberSerial || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">N<sub>sk</sub> Factor:</span>
                  <div className="font-mono font-medium">{chamberNsk || "-"} μGy·m²·h⁻¹·nA⁻¹</div>
                </div>
                <div>
                  <span className="text-gray-500">Electrometer:</span>
                  <div className="font-medium">{electrometerModel || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Electrometer S/N:</span>
                  <div className="font-medium">{electrometerSerial || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">k<sub>elec</sub>:</span>
                  <div className="font-mono font-medium">{electrometerFactor || "1.000"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Applicator Type:</span>
                  <div className="font-medium">{applicatorType || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">k<sub>applicator</sub>:</span>
                  <div className="font-mono font-medium">{applicatorFactor || "1.029"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Sweet Spot:</span>
                  <div className="font-mono font-medium">{sweetSpotPosition || "-"} mm</div>
                </div>
              </div>
            </div>

            {/* Measurement Conditions */}
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-700 mb-2">MEASUREMENT CONDITIONS</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <div className="font-mono font-medium">{measuredTemp || "-"} °C</div>
                </div>
                <div>
                  <span className="text-gray-500">Pressure:</span>
                  <div className="font-mono font-medium">{measuredPressure || "-"} kPa</div>
                </div>
                <div>
                  <span className="text-gray-500">Ref Temp T₀:</span>
                  <div className="font-mono font-medium">{refTemp || "20"} °C</div>
                </div>
                <div>
                  <span className="text-gray-500">Ref Press P₀:</span>
                  <div className="font-mono font-medium">{refPressure || "101.325"} kPa</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">k<sub>TP</sub>:</span>
                  <div className="font-mono font-medium">{kTP !== null ? kTP.toFixed(6) : "-"}</div>
                </div>
              </div>
            </div>

            {/* Chamber Readings */}
            <div className="p-4 border-b">
              <h2 className="text-sm font-bold text-gray-700 mb-2">CHAMBER READINGS</h2>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Reading 1</div>
                  <div className="font-mono font-medium">{readings[0] || "-"} nA</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Reading 2</div>
                  <div className="font-mono font-medium">{readings[1] || "-"} nA</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Reading 3</div>
                  <div className="font-mono font-medium">{readings[2] || "-"} nA</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-xs text-blue-600">Mean (M)</div>
                  <div className="font-mono font-bold text-blue-700">{meanReading !== null ? meanReading.toFixed(3) : "-"} nA</div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="p-4 bg-blue-50">
              <h2 className="text-sm font-bold text-blue-800 mb-3">RESULTS</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Expected S<sub>k</sub></div>
                  <div className="font-mono text-xl font-bold text-amber-600">{decayedCert !== null ? decayedCert.toFixed(1) : "-"}</div>
                  <div className="text-xs text-gray-400">μGy·m²·h⁻¹</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Measured S<sub>k</sub></div>
                  <div className="font-mono text-xl font-bold text-blue-600">{measuredSRAK !== null ? measuredSRAK.toFixed(1) : "-"}</div>
                  <div className="text-xs text-gray-400">μGy·m²·h⁻¹</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Deviation</div>
                  <div className={`font-mono text-xl font-bold ${deviation !== null && Math.abs(deviation) > 3 ? "text-red-600" : "text-green-600"}`}>
                    {deviation !== null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%` : "-"}
                  </div>
                  <div className="text-xs text-gray-400">Tolerance: ±3%</div>
                </div>
              </div>

              {/* Calculation Formula */}
              <div className="p-3 bg-white rounded text-sm">
                <div className="font-medium mb-1">Calculation:</div>
                <div className="font-mono text-gray-600">
                  S<sub>k</sub> = M × N<sub>sk</sub> × k<sub>TP</sub> × k<sub>elec</sub> × k<sub>app</sub> × k<sub>source</sub>
                </div>
                <div className="font-mono text-gray-600 mt-1">
                  S<sub>k</sub> = {meanReading?.toFixed(3) || "-"} × {chamberNsk || "-"} × {kTP?.toFixed(4) || "-"} × {electrometerFactor || "1.0000"} × {applicatorFactor || "1.0000"} × {sourceFactor || "1.0000"}
                </div>
                <div className="font-mono font-bold text-blue-700 mt-1">
                  S<sub>k</sub> = {measuredSRAK !== null ? measuredSRAK.toFixed(1) : "-"} μGy·m²·h⁻¹
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="p-4 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-b border-gray-300 h-12"></div>
                  <div className="text-xs text-gray-500 mt-1">Performed By / Date</div>
                </div>
                <div>
                  <div className="border-b border-gray-300 h-12"></div>
                  <div className="text-xs text-gray-500 mt-1">Reviewed By / Date</div>
                </div>
              </div>
            </div>

            {/* Print Button */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Print
              </button>
              <button
                onClick={() => setShowPrintReport(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:relative,
          .print\\:relative * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Stopwatch Component
// For timing dwell times and other measurements
// ============================================================================
interface StopwatchProps {
  onTimeCapture?: (timeInSeconds: number) => void;
  compact?: boolean;
}

export function Stopwatch({ onTimeCapture, compact = false }: StopwatchProps) {
  const [time, setTime] = useState(0); // time in centiseconds (1/100 sec)
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<{ time: number; label: string }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 10); // Update every 10ms for centiseconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (centiseconds: number) => {
    const hours = Math.floor(centiseconds / 360000);
    const minutes = Math.floor((centiseconds % 360000) / 6000);
    const seconds = Math.floor((centiseconds % 6000) / 100);
    const cs = centiseconds % 100;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  };

  const getTimeInSeconds = () => {
    return time / 100;
  };

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };

  const handleLap = () => {
    if (time > 0) {
      const lapNumber = laps.length + 1;
      setLaps([...laps, { time, label: `Lap ${lapNumber}` }]);
    }
  };

  const handleCapture = () => {
    if (onTimeCapture && time > 0) {
      onTimeCapture(getTimeInSeconds());
    }
  };

  const deleteLap = (index: number) => {
    setLaps(laps.filter((_, i) => i !== index));
  };

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg p-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-2xl font-bold tracking-wider text-green-400">
            {formatTime(time)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStartStop}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isRunning
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isRunning ? "Stop" : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
            >
              Reset
            </button>
            {onTimeCapture && (
              <button
                onClick={handleCapture}
                disabled={time === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors"
              >
                Use Time
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 text-white">
      {/* Timer Display */}
      <div className="text-center mb-4">
        <div className="font-mono text-4xl sm:text-5xl font-bold tracking-wider text-green-400 py-4">
          {formatTime(time)}
        </div>
        <div className="text-xs text-gray-400">
          {getTimeInSeconds().toFixed(2)} seconds
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <button
          onClick={handleStartStop}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isRunning
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
        <button
          onClick={handleLap}
          disabled={time === 0}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-semibold transition-colors"
        >
          Lap
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors"
        >
          Reset
        </button>
        {onTimeCapture && (
          <button
            onClick={handleCapture}
            disabled={time === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-semibold transition-colors"
          >
            Use Time
          </button>
        )}
      </div>

      {/* Laps */}
      {laps.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs uppercase text-gray-400 mb-2 font-semibold">Recorded Laps</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {laps.map((lap, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-800 rounded px-3 py-1.5 text-sm"
              >
                <span className="text-gray-400">{lap.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-green-400">{formatTime(lap.time)}</span>
                  <span className="text-gray-500 text-xs">({(lap.time / 100).toFixed(2)}s)</span>
                  <button
                    onClick={() => deleteLap(index)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  // SRAK-specific props
  equipmentId?: string;
  equipmentName?: string;
  organizationName?: string;
  onSaveSRAKReport?: (data: SRAKReportData) => Promise<void>;
}

export function InlineCalculator({ calculatorType, testId, tolerance, actionLevel, initialValues, onUpdate, onSaveBaseline, equipmentId, equipmentName, organizationName, onSaveSRAKReport }: InlineCalculatorProps) {
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
    case "srak_calculation":
      return <SRAKCalculator {...props} equipmentId={equipmentId} equipmentName={equipmentName} organizationName={organizationName} onSaveSRAKReport={onSaveSRAKReport} />;
    default:
      return null;
  }
}
