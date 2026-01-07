"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Equipment,
  EquipmentType,
  QAFrequency,
  QATestDefinition,
  QAStatus,
  EQUIPMENT_TYPE_LABELS,
  FREQUENCY_LABELS,
} from "@/types/database";

interface TestResult {
  test_id: string;
  status: QAStatus;
  measurement?: number;
  notes?: string;
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
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) {
      loadData();
    }
  }, [isLoaded, equipmentType, frequency, equipmentId]);

  const loadData = async () => {
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
          notes: "",
        };
      });
      setResults(initialResults);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const updateResult = (testId: string, field: keyof TestResult, value: QAStatus | number | string | undefined) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value,
      },
    }));
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
          results: Object.values(results),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save QA report");
      }

      // Navigate to dashboard on success
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
      newResults[test.test_id] = {
        ...results[test.test_id],
        status: "pass",
      };
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
        <div className="flex gap-2">
          <button
            onClick={setAllPass}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            Mark All Pass
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test sections by category */}
        {Object.keys(testsByCategory).length > 0 ? (
          Object.entries(testsByCategory).map(([category, categoryTests]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="divide-y">
                {categoryTests.map((test) => (
                  <div key={test.test_id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Test info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                            {test.test_id}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{test.description}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {test.tolerance && (
                                <span className="text-xs text-gray-500">
                                  Tolerance: {test.tolerance}
                                </span>
                              )}
                              {test.action_level && (
                                <span className="text-xs text-red-500">
                                  Action: {test.action_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Result buttons */}
                      <div className="flex items-center gap-2">
                        {["pass", "fail", "na"].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => updateResult(test.test_id, "status", status as QAStatus)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              results[test.test_id]?.status === status
                                ? status === "pass"
                                  ? "bg-green-500 text-white"
                                  : status === "fail"
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {status === "na" ? "N/A" : status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Measurement field for tests that require it */}
                    {test.requires_measurement && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Measurement"
                          value={results[test.test_id]?.measurement || ""}
                          onChange={(e) =>
                            updateResult(
                              test.test_id,
                              "measurement",
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {test.measurement_unit && (
                          <span className="text-sm text-gray-500">{test.measurement_unit}</span>
                        )}
                      </div>
                    )}

                    {/* Notes field if failed */}
                    {results[test.test_id]?.status === "fail" && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Notes (required for failures)"
                          value={results[test.test_id]?.notes || ""}
                          onChange={(e) => updateResult(test.test_id, "notes", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-red-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">
              No test definitions found for {FREQUENCY_LABELS[frequency]} QA on {EQUIPMENT_TYPE_LABELS[equipmentType]}.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Test definitions need to be added to the database for this equipment type and frequency.
            </p>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments / Notes
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
