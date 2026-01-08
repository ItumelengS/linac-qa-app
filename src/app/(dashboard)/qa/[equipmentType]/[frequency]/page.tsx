"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Equipment,
  EquipmentType,
  QAFrequency,
  QATestDefinition,
  QAStatus,
  CalculatorType,
  BaselineValues,
  EQUIPMENT_TYPE_LABELS,
  FREQUENCY_LABELS,
} from "@/types/database";
import { InlineCalculator, CalculatorResult } from "@/components/qa-calculators";

interface TestResult {
  test_id: string;
  status: QAStatus;
  measurement?: number;
  baseline_value?: number;
  deviation?: number;
  notes?: string;
}

// Parse tolerance string to get numeric value and type
function parseTolerance(tolerance: string | null | undefined): { value: number; isPercent: boolean } | null {
  if (!tolerance) return null;

  // Match patterns like "±3%", "±1mm", "±0.5s", "±2mm"
  const match = tolerance.match(/[±]?\s*(\d+\.?\d*)\s*(%|mm|s|U|µSv\/h)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const isPercent = match[2] === '%';

  return { value, isPercent };
}

// Calculate status based on measurement and tolerance
function calculateStatus(
  measurement: number | undefined,
  baseline: number | undefined,
  tolerance: string | null | undefined,
  actionLevel: string | null | undefined
): { status: QAStatus; deviation: number | undefined; message: string } {
  if (measurement === undefined) {
    return { status: "", deviation: undefined, message: "" };
  }

  const tol = parseTolerance(tolerance);
  const action = parseTolerance(actionLevel);

  if (!tol) {
    return { status: "", deviation: undefined, message: "Enter measurement" };
  }

  let deviation: number;
  let deviationDisplay: string;

  if (tol.isPercent) {
    // For percentage tolerance, we need a baseline
    if (baseline === undefined || baseline === 0) {
      return { status: "", deviation: undefined, message: "Enter reference value" };
    }
    deviation = ((measurement - baseline) / baseline) * 100;
    deviationDisplay = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}%`;
  } else {
    // For absolute tolerance, measurement IS the deviation from expected
    deviation = measurement;
    deviationDisplay = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}`;
  }

  const absDeviation = Math.abs(deviation);

  // Check against tolerance and action level
  if (absDeviation <= tol.value) {
    return {
      status: "pass",
      deviation,
      message: `${deviationDisplay} (within ±${tol.value}${tol.isPercent ? '%' : ''} tolerance)`
    };
  }

  if (action && absDeviation <= action.value) {
    return {
      status: "pass",
      deviation,
      message: `${deviationDisplay} (within action level, investigate)`
    };
  }

  if (action && absDeviation > action.value) {
    return {
      status: "fail",
      deviation,
      message: `${deviationDisplay} (exceeds ±${action.value}${action.isPercent ? '%' : ''} action level)`
    };
  }

  return {
    status: "fail",
    deviation,
    message: `${deviationDisplay} (exceeds ±${tol.value}${tol.isPercent ? '%' : ''} tolerance)`
  };
}

function QAFormContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded } = useUser();

  const equipmentType = params.equipmentType as EquipmentType;
  const frequency = params.frequency as QAFrequency;
  const equipmentId = searchParams.get("equipment");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [tests, setTests] = useState<QATestDefinition[]>([]);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [baselines, setBaselines] = useState<Record<string, { values: BaselineValues; notes?: string }>>({});
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/qa/form?equipment=${equipmentId || ""}&equipmentType=${equipmentType}&frequency=${frequency}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load QA form data");
      }

      setEquipment(data.equipment);
      setTests(data.tests || []);

      // Initialize results
      const initialResults: Record<string, TestResult> = {};
      data.tests?.forEach((test: QATestDefinition) => {
        initialResults[test.test_id] = {
          test_id: test.test_id,
          status: "",
          measurement: undefined,
          baseline_value: undefined,
          deviation: undefined,
          notes: "",
        };
      });
      setResults(initialResults);

      // Fetch baselines for this equipment
      if (data.equipment?.id) {
        try {
          const baselineResponse = await fetch(`/api/equipment/${data.equipment.id}/baselines`);
          if (baselineResponse.ok) {
            const baselineData = await baselineResponse.json();
            setBaselines(baselineData.baselines || {});
          }
        } catch (err) {
          console.error("Error fetching baselines:", err);
          // Non-critical error, continue without baselines
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [equipmentId, equipmentType, frequency]);

  useEffect(() => {
    if (isLoaded) {
      loadData();
    }
  }, [isLoaded, loadData]);

  const updateMeasurement = (testId: string, measurement: number | undefined, test: QATestDefinition) => {
    const currentResult = results[testId];
    const baseline = currentResult?.baseline_value;
    const { status, deviation, message } = calculateStatus(measurement, baseline, test.tolerance, test.action_level);

    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        measurement,
        deviation,
        status: status || prev[testId]?.status || "",
        notes: status === "fail" ? message : prev[testId]?.notes || "",
      },
    }));
  };

  const updateBaseline = (testId: string, baseline: number | undefined, test: QATestDefinition) => {
    const currentResult = results[testId];
    const measurement = currentResult?.measurement;
    const { status, deviation, message } = calculateStatus(measurement, baseline, test.tolerance, test.action_level);

    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        baseline_value: baseline,
        deviation,
        status: status || prev[testId]?.status || "",
        notes: status === "fail" ? message : prev[testId]?.notes || "",
      },
    }));
  };

  const updateStatus = (testId: string, status: QAStatus) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        status,
      },
    }));
  };

  const updateNotes = (testId: string, notes: string) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        notes,
      },
    }));
  };

  // Handler for inline calculator results
  const handleCalculatorUpdate = (testId: string, result: CalculatorResult) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        measurement: result.measurement,
        baseline_value: result.baseline_value,
        deviation: result.deviation,
        status: result.status || prev[testId]?.status || "",
        notes: result.notes || prev[testId]?.notes || "",
      },
    }));
  };

  // Handler for saving baseline values
  const handleSaveBaseline = async (testId: string, values: BaselineValues) => {
    if (!equipment) return;

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_id: testId, values }),
      });

      if (response.ok) {
        setBaselines((prev) => ({
          ...prev,
          [testId]: { values },
        }));
      }
    } catch (err) {
      console.error("Error saving baseline:", err);
    }
  };

  // Handler for saving all current measurements as baselines
  const [savingBaselines, setSavingBaselines] = useState(false);
  const [baselineSaveMessage, setBaselineSaveMessage] = useState<string | null>(null);

  const handleSetAllAsBaseline = async () => {
    if (!equipment) return;

    setSavingBaselines(true);
    setBaselineSaveMessage(null);

    try {
      const testsWithMeasurements = tests.filter(
        (test) => test.requires_measurement && results[test.test_id]?.measurement !== undefined
      );

      if (testsWithMeasurements.length === 0) {
        setBaselineSaveMessage("No measurements to save as baselines");
        setSavingBaselines(false);
        return;
      }

      let savedCount = 0;
      for (const test of testsWithMeasurements) {
        const result = results[test.test_id];
        let values: BaselineValues = {};

        // Build values based on calculator type
        if (test.calculator_type === "source_decay_check") {
          // For source decay, we need initial_activity and calibration_date from current state
          const existingBaseline = baselines[test.test_id]?.values as { initial_activity?: number; calibration_date?: string };
          if (existingBaseline?.initial_activity && existingBaseline?.calibration_date) {
            values = existingBaseline; // Keep existing source data
          }
        } else if (test.calculator_type === "position_deviation") {
          values = { expected_position: result.baseline_value || result.measurement };
        } else if (test.calculator_type === "dwell_time") {
          values = { set_time: result.baseline_value || result.measurement };
        } else if (test.calculator_type === "percentage_difference") {
          values = { reference_value: result.baseline_value || result.measurement };
        } else if (test.calculator_type === "timer_linearity") {
          const existingBaseline = baselines[test.test_id]?.values as { time_points?: number[] };
          values = { time_points: existingBaseline?.time_points || [10, 30, 60, 120] };
        } else {
          // Generic measurement-based baseline
          values = { reference_value: result.measurement };
        }

        if (Object.keys(values).length > 0) {
          const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test_id: test.test_id, values }),
          });

          if (response.ok) {
            savedCount++;
            setBaselines((prev) => ({
              ...prev,
              [test.test_id]: { values },
            }));
          }
        }
      }

      setBaselineSaveMessage(`Saved ${savedCount} baseline${savedCount !== 1 ? 's' : ''} successfully`);
      setTimeout(() => setBaselineSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error saving baselines:", err);
      setBaselineSaveMessage("Error saving baselines");
    } finally {
      setSavingBaselines(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/qa/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipment_id: equipment.id,
          qa_type: frequency,
          comments,
          results: Object.values(results).map(r => ({
            test_id: r.test_id,
            status: r.status,
            measurement: r.measurement,
            baseline_value: r.baseline_value,
            deviation: r.deviation,
            notes: r.notes,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save QA report");
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving report:", err);
      setError(err instanceof Error ? err.message : "Failed to save QA report");
    } finally {
      setSaving(false);
    }
  };

  const setAllPass = () => {
    const newResults: Record<string, TestResult> = {};
    tests.forEach((test) => {
      // Only auto-pass functional tests (no measurement required)
      if (!test.requires_measurement) {
        newResults[test.test_id] = {
          ...results[test.test_id],
          status: "pass",
        };
      } else {
        newResults[test.test_id] = results[test.test_id];
      }
    });
    setResults(newResults);
  };

  // Group tests by category
  const testsByCategory = tests.reduce(
    (acc, test) => {
      const category = test.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(test);
      return acc;
    },
    {} as Record<string, QATestDefinition[]>
  );

  // Check if test requires percentage calculation (has % in tolerance)
  const isPercentTolerance = (tolerance: string | null | undefined) => {
    return tolerance?.includes('%') || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 mb-4">Equipment not found. Please select equipment from the QA page.</p>
        <button
          onClick={() => router.push("/qa")}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to QA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {FREQUENCY_LABELS[frequency]} QA
          </h1>
          <p className="text-gray-500">
            {equipment.name} - {EQUIPMENT_TYPE_LABELS[equipmentType]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={setAllPass}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            Mark All Functional Pass
          </button>
          <button
            onClick={handleSetAllAsBaseline}
            disabled={savingBaselines}
            className="px-3 py-2 text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {savingBaselines ? "Saving..." : "Set as Baseline"}
          </button>
          {baselineSaveMessage && (
            <span className={`text-sm px-2 py-1 rounded ${
              baselineSaveMessage.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {baselineSaveMessage}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.keys(testsByCategory).length > 0 ? (
          Object.entries(testsByCategory).map(([category, categoryTests]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="divide-y">
                {categoryTests.map((test) => {
                  const result = results[test.test_id];
                  const needsBaseline = test.requires_measurement && isPercentTolerance(test.tolerance);
                  const statusColor = result?.status === "pass"
                    ? "bg-green-50 border-green-200"
                    : result?.status === "fail"
                    ? "bg-red-50 border-red-200"
                    : "";

                  return (
                    <div key={test.test_id} className={`p-4 ${statusColor} transition-colors`}>
                      <div className="flex flex-col gap-3">
                        {/* Test info */}
                        <div className="flex items-start gap-2">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono shrink-0">
                            {test.test_id}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{test.description}</p>
                            <div className="flex flex-wrap gap-3 mt-1">
                              {test.tolerance && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  Tolerance: {test.tolerance}
                                </span>
                              )}
                              {test.action_level && (
                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  Action: {test.action_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Calculator for tests with calculator_type */}
                        {test.calculator_type ? (
                          <div className="space-y-3">
                            <InlineCalculator
                              calculatorType={test.calculator_type}
                              testId={test.test_id}
                              tolerance={test.tolerance}
                              actionLevel={test.action_level}
                              initialValues={baselines[test.test_id]?.values}
                              onUpdate={(calcResult) => handleCalculatorUpdate(test.test_id, calcResult)}
                              onSaveBaseline={(values) => handleSaveBaseline(test.test_id, values)}
                            />
                            {/* Status display, override buttons, and Set as Baseline */}
                            <div className="flex flex-wrap items-center gap-3">
                              {result?.status && (
                                <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                  result.status === "pass"
                                    ? "bg-green-100 text-green-800"
                                    : result.status === "fail"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 mr-1">Override:</span>
                                {["pass", "fail", "na"].map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      result?.status === status
                                        ? status === "pass"
                                          ? "bg-green-500 text-white"
                                          : status === "fail"
                                          ? "bg-red-500 text-white"
                                          : "bg-gray-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : test.requires_measurement ? (
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                            {/* Reference/Baseline value for percentage tolerances */}
                            {needsBaseline && (
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">Reference Value</label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="Expected"
                                    value={result?.baseline_value ?? ""}
                                    onChange={(e) =>
                                      updateBaseline(
                                        test.test_id,
                                        e.target.value ? parseFloat(e.target.value) : undefined,
                                        test
                                      )
                                    }
                                    className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  {test.measurement_unit && (
                                    <span className="text-xs text-gray-500">{test.measurement_unit}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Measured value */}
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 mb-1">
                                {needsBaseline ? "Measured Value" : "Deviation from Expected"}
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={needsBaseline ? "Measured" : "Deviation"}
                                  value={result?.measurement ?? ""}
                                  onChange={(e) =>
                                    updateMeasurement(
                                      test.test_id,
                                      e.target.value ? parseFloat(e.target.value) : undefined,
                                      test
                                    )
                                  }
                                  className={`w-24 px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                    result?.status === "pass"
                                      ? "border-green-300 focus:ring-green-500"
                                      : result?.status === "fail"
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-gray-300 focus:ring-primary"
                                  }`}
                                />
                                {test.measurement_unit && (
                                  <span className="text-xs text-gray-500">{test.measurement_unit}</span>
                                )}
                              </div>
                            </div>

                            {/* Auto-calculated result display */}
                            {result?.status && (
                              <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                result.status === "pass"
                                  ? "bg-green-100 text-green-800"
                                  : result.status === "fail"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                {result.deviation !== undefined && (
                                  <span className="ml-1 text-xs">
                                    ({result.deviation >= 0 ? "+" : ""}{result.deviation.toFixed(2)}{isPercentTolerance(test.tolerance) ? "%" : ""})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Manual override buttons */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400 mr-1">Override:</span>
                              {["pass", "fail", "na"].map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    result?.status === status
                                      ? status === "pass"
                                        ? "bg-green-500 text-white"
                                        : status === "fail"
                                        ? "bg-red-500 text-white"
                                        : "bg-gray-500 text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Functional test - just Pass/Fail/N/A buttons */
                          <div className="flex items-center gap-2">
                            {["pass", "fail", "na"].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                  result?.status === status
                                    ? status === "pass"
                                      ? "bg-green-500 text-white"
                                      : status === "fail"
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {status === "na" ? "N/A" : status === "pass" ? "Pass" : "Fail"}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Notes field - always show for fails, optional for others */}
                        {(result?.status === "fail" || result?.notes) && (
                          <div>
                            <input
                              type="text"
                              placeholder={result?.status === "fail" ? "Notes required for failures..." : "Additional notes..."}
                              value={result?.notes || ""}
                              onChange={(e) => updateNotes(test.test_id, e.target.value)}
                              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                result?.status === "fail"
                                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                                  : "border-gray-300 focus:ring-primary"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">
              No test definitions found for {FREQUENCY_LABELS[frequency]} QA on {EQUIPMENT_TYPE_LABELS[equipmentType]}.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Test definitions need to be added to the database.
            </p>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            General Comments / Notes
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Add any additional comments or observations..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Submit QA Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function QAFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <QAFormContent />
    </Suspense>
  );
}
