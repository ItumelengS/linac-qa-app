"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export default function QAFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

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
  const [profile, setProfile] = useState<{ id: string; full_name: string; organization_id: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [equipmentType, frequency, equipmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, organization_id")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Get equipment
      if (equipmentId) {
        const { data: equipmentData } = await supabase
          .from("equipment")
          .select("*")
          .eq("id", equipmentId)
          .single();

        setEquipment(equipmentData);
      }

      // Get test definitions
      const { data: testData } = await supabase
        .from("qa_test_definitions")
        .select("*")
        .eq("equipment_type", equipmentType)
        .eq("frequency", frequency)
        .eq("is_active", true)
        .order("display_order");

      setTests(testData || []);

      // Initialize results
      const initialResults: Record<string, TestResult> = {};
      testData?.forEach((test) => {
        initialResults[test.test_id] = {
          test_id: test.test_id,
          status: "",
          measurement: undefined,
          notes: "",
        };
      });
      setResults(initialResults);
    } catch {
      console.error("Error loading data");
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
    if (!profile || !equipment) return;

    setSaving(true);
    setError(null);

    try {
      // Calculate overall result
      const testResults = Object.values(results);
      const hasFailure = testResults.some((r) => r.status === "fail");
      const allPassed = testResults.every((r) => r.status === "pass" || r.status === "na");
      const overallResult = hasFailure ? "fail" : allPassed ? "pass" : "conditional";

      // Create the QA report
      const { data: report, error: reportError } = await supabase
        .from("qa_reports")
        .insert({
          organization_id: profile.organization_id,
          equipment_id: equipment.id,
          qa_type: frequency,
          date: new Date().toISOString().split("T")[0],
          performer_id: profile.id,
          performer_name: profile.full_name,
          status: "submitted",
          overall_result: overallResult,
          comments: comments || null,
          created_by: profile.id,
        })
        .select()
        .single();

      if (reportError) {
        setError(reportError.message);
        return;
      }

      // Insert test results
      const testInserts = Object.values(results)
        .filter((r) => r.status)
        .map((r) => ({
          report_id: report.id,
          test_id: r.test_id,
          status: r.status,
          measurement: r.measurement || null,
          notes: r.notes || null,
        }));

      if (testInserts.length > 0) {
        const { error: testsError } = await supabase.from("qa_tests").insert(testInserts);

        if (testsError) {
          setError(testsError.message);
          return;
        }
      }

      // Navigate to dashboard
      router.push("/dashboard");
    } catch {
      setError("Failed to save QA report");
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
      const category = test.category || "Other";
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
        <p className="text-red-700">Equipment not found. Please select equipment from the QA page.</p>
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
        {Object.entries(testsByCategory).map(([category, categoryTests]) => (
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
        ))}

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
