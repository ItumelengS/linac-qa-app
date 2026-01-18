"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  EquipmentType,
  EQUIPMENT_TYPE_LABELS,
  QAFrequency,
  FREQUENCY_LABELS,
  QATestDefinition,
  CalculatorType,
} from "@/types/database";

const CALCULATOR_TYPES: { value: CalculatorType; label: string }[] = [
  { value: "percentage_difference", label: "Percentage Difference" },
  { value: "position_deviation", label: "Position Deviation" },
  { value: "dwell_time", label: "Dwell Time" },
  { value: "timer_linearity", label: "Timer Linearity" },
  { value: "transit_reproducibility", label: "Transit Reproducibility" },
  { value: "source_decay_check", label: "Source Decay Check" },
  { value: "srak_calculation", label: "SRAK Calculation" },
];

const EQUIPMENT_TYPES: EquipmentType[] = [
  // Radiation Therapy
  "linac", "bore_linac", "linac_srs", "cobalt60", "ct_simulator",
  "conventional_simulator", "tps", "brachytherapy_hdr", "brachytherapy_ldr",
  "kilovoltage", "kilovoltage_intraop", "gamma_knife", "mlc", "epid",
  "record_verify", "imrt_vmat", "radiation_protection",
  // Nuclear Medicine
  "gamma_camera", "spect", "spect_ct", "pet", "pet_ct", "pet_mri",
  "dose_calibrator", "thyroid_uptake",
  // Diagnostic Radiology
  "xray_general", "fluoroscopy", "mammography", "ct_diagnostic", "mri",
  "dental_xray", "c_arm", "dexa", "angiography",
];

const FREQUENCIES: QAFrequency[] = [
  "daily", "weekly", "monthly", "quarterly", "biannual", "annual", "biennial",
  "patient_specific", "commissioning", "as_needed",
];

export default function TestManagerPage() {
  const { isLoaded } = useUser();
  const [tests, setTests] = useState<QATestDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterEquipment, setFilterEquipment] = useState<EquipmentType | "all">("all");
  const [filterFrequency, setFilterFrequency] = useState<QAFrequency | "all">("all");
  const [showInactive, setShowInactive] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingTest, setEditingTest] = useState<QATestDefinition | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({
    equipment_type: "spect_ct" as EquipmentType,
    frequency: "daily" as QAFrequency,
    test_id: "",
    description: "",
    tolerance: "",
    action_level: "",
    category: "",
    requires_measurement: false,
    measurement_unit: "",
    calculator_type: "" as CalculatorType | "",
  });

  useEffect(() => {
    if (isLoaded) {
      fetchTests();
    }
  }, [isLoaded, filterEquipment, filterFrequency, showInactive]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterEquipment !== "all") params.set("equipment_type", filterEquipment);
      if (filterFrequency !== "all") params.set("frequency", filterFrequency);
      if (showInactive) params.set("include_inactive", "true");

      const response = await fetch(`/api/tests?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);
      setTests(data.tests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          calculator_type: addForm.calculator_type || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess("Test added successfully");
      setShowAddModal(false);
      setAddForm({
        equipment_type: addForm.equipment_type,
        frequency: addForm.frequency,
        test_id: "",
        description: "",
        tolerance: "",
        action_level: "",
        category: "",
        requires_measurement: false,
        measurement_unit: "",
        calculator_type: "",
      });
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add test");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTest = async (test: QATestDefinition) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tests/${test.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(test),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess("Test updated");
      setEditingTest(null);
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;

    try {
      const response = await fetch(`/api/tests/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      setSuccess("Test deleted");
      fetchTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test");
    }
  };

  const handleToggleActive = async (test: QATestDefinition) => {
    await handleUpdateTest({ ...test, is_active: !test.is_active });
  };

  // Group tests by equipment type and frequency
  const groupedTests = tests.reduce((acc, test) => {
    const key = `${test.equipment_type}-${test.frequency}`;
    if (!acc[key]) {
      acc[key] = {
        equipment_type: test.equipment_type,
        frequency: test.frequency,
        tests: [],
      };
    }
    acc[key].tests.push(test);
    return acc;
  }, {} as Record<string, { equipment_type: EquipmentType; frequency: QAFrequency; tests: QATestDefinition[] }>);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Test Manager</h1>
          <p className="text-gray-500">Define and manage QA test checklists for all equipment types</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Batch Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Test
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
            <select
              value={filterEquipment}
              onChange={(e) => setFilterEquipment(e.target.value as EquipmentType | "all")}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Equipment</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>{EQUIPMENT_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value as QAFrequency | "all")}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Frequencies</option>
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>{FREQUENCY_LABELS[freq]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show inactive</span>
            </label>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-600 underline mt-1">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-sm text-green-600 underline mt-1">Dismiss</button>
        </div>
      )}

      {/* Tests List */}
      {Object.keys(groupedTests).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTests).map(([key, group]) => (
            <div key={key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">
                  {EQUIPMENT_TYPE_LABELS[group.equipment_type]} - {FREQUENCY_LABELS[group.frequency]}
                  <span className="ml-2 text-sm text-gray-500">({group.tests.length} tests)</span>
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {group.tests.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 ${!test.is_active ? "bg-gray-50 opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                            {test.test_id}
                          </span>
                          {test.category && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {test.category}
                            </span>
                          )}
                          {!test.is_active && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-gray-900">{test.description}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                          {test.tolerance && <span>Tolerance: {test.tolerance}</span>}
                          {test.action_level && <span>Action: {test.action_level}</span>}
                          {test.measurement_unit && <span>Unit: {test.measurement_unit}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(test)}
                          className={`p-2 rounded transition-colors ${
                            test.is_active
                              ? "text-green-600 hover:bg-green-50"
                              : "text-gray-400 hover:bg-gray-100"
                          }`}
                          title={test.is_active ? "Deactivate" : "Activate"}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingTest(test)}
                          className="p-2 text-gray-400 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No tests found. Add some tests to get started.</p>
        </div>
      )}

      {/* Add Test Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add QA Test</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddTest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type *</label>
                  <select
                    value={addForm.equipment_type}
                    onChange={(e) => setAddForm({ ...addForm, equipment_type: e.target.value as EquipmentType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {EQUIPMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{EQUIPMENT_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                  <select
                    value={addForm.frequency}
                    onChange={(e) => setAddForm({ ...addForm, frequency: e.target.value as QAFrequency })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>{FREQUENCY_LABELS[freq]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test ID *</label>
                  <input
                    type="text"
                    value={addForm.test_id}
                    onChange={(e) => setAddForm({ ...addForm, test_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., DSC1, QSC2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Image Quality, Safety"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tolerance</label>
                  <input
                    type="text"
                    value={addForm.tolerance}
                    onChange={(e) => setAddForm({ ...addForm, tolerance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., ±5%, <2mm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Level</label>
                  <input
                    type="text"
                    value={addForm.action_level}
                    onChange={(e) => setAddForm({ ...addForm, action_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., ±3%, <1mm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Unit</label>
                  <input
                    type="text"
                    value={addForm.measurement_unit}
                    onChange={(e) => setAddForm({ ...addForm, measurement_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., mm, %, counts"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calculator Type</label>
                  <select
                    value={addForm.calculator_type}
                    onChange={(e) => setAddForm({ ...addForm, calculator_type: e.target.value as CalculatorType | "" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">None</option>
                    {CALCULATOR_TYPES.map((calc) => (
                      <option key={calc.value} value={calc.value}>{calc.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addForm.requires_measurement}
                    onChange={(e) => setAddForm({ ...addForm, requires_measurement: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Requires measurement value</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchModal && (
        <BatchImportModal
          onClose={() => setShowBatchModal(false)}
          onImport={async (tests) => {
            setSaving(true);
            try {
              const response = await fetch("/api/tests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tests }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setSuccess(`Successfully imported ${tests.length} tests`);
              setShowBatchModal(false);
              fetchTests();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to import tests");
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
        />
      )}

      {/* Edit Modal */}
      {editingTest && (
        <EditTestModal
          test={editingTest}
          onClose={() => setEditingTest(null)}
          onSave={handleUpdateTest}
          saving={saving}
        />
      )}
    </div>
  );
}

function EditTestModal({
  test,
  onClose,
  onSave,
  saving,
}: {
  test: QATestDefinition;
  onClose: () => void;
  onSave: (test: QATestDefinition) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...test });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Test: {test.test_id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tolerance</label>
              <input
                type="text"
                value={form.tolerance || ""}
                onChange={(e) => setForm({ ...form, tolerance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Level</label>
              <input
                type="text"
                value={form.action_level || ""}
                onChange={(e) => setForm({ ...form, action_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={form.category || ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Unit</label>
              <input
                type="text"
                value={form.measurement_unit || ""}
                onChange={(e) => setForm({ ...form, measurement_unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TestImport {
  equipment_type: EquipmentType;
  frequency: QAFrequency;
  test_id: string;
  description: string;
  tolerance?: string | null;
  action_level?: string | null;
  category?: string | null;
  requires_measurement?: boolean;
  measurement_unit?: string | null;
  calculator_type?: CalculatorType | null;
}

function BatchImportModal({
  onClose,
  onImport,
  saving,
}: {
  onClose: () => void;
  onImport: (tests: TestImport[]) => void;
  saving: boolean;
}) {
  const [importMode, setImportMode] = useState<"text" | "json">("text");
  const [batchText, setBatchText] = useState("");
  const [batchEquipment, setBatchEquipment] = useState<EquipmentType>("spect_ct");
  const [batchFrequency, setBatchFrequency] = useState<QAFrequency>("daily");
  const [jsonTests, setJsonTests] = useState<TestImport[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate and normalize the JSON
        const tests: TestImport[] = Array.isArray(parsed) ? parsed : parsed.tests || [];

        if (tests.length === 0) {
          throw new Error("No tests found in JSON file");
        }

        // Validate required fields
        for (let i = 0; i < tests.length; i++) {
          const test = tests[i];
          if (!test.equipment_type || !test.frequency || !test.test_id || !test.description) {
            throw new Error(`Test ${i + 1}: Missing required fields (equipment_type, frequency, test_id, description)`);
          }
        }

        setJsonTests(tests);
        setParseError(null);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Invalid JSON file");
        setJsonTests([]);
      }
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    const lines = batchText.trim().split("\n").filter(line => line.trim());
    if (lines.length === 0) return;

    const tests: TestImport[] = lines.map((line) => {
      let parts = line.split("\t");
      if (parts.length < 2) {
        parts = line.split(",").map(p => p.trim());
      }

      return {
        equipment_type: batchEquipment,
        frequency: batchFrequency,
        test_id: parts[0]?.trim() || "",
        description: parts[1]?.trim() || "",
        tolerance: parts[2]?.trim() || null,
        action_level: parts[3]?.trim() || null,
        category: parts[4]?.trim() || null,
        requires_measurement: false,
      };
    });

    onImport(tests);
  };

  const handleJsonImport = () => {
    onImport(jsonTests);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Batch Import Tests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Import Mode Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setImportMode("text")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                importMode === "text"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Paste from Spreadsheet
            </button>
            <button
              onClick={() => setImportMode("json")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                importMode === "json"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Upload JSON File
            </button>
          </div>

          {importMode === "text" ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Format Instructions</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Paste tests in tab-separated or comma-separated format. One test per line:
                </p>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded block">
                  test_id, description, tolerance, action_level, category
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  Only test_id and description are required. Copy/paste directly from Excel.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                  <select
                    value={batchEquipment}
                    onChange={(e) => setBatchEquipment(e.target.value as EquipmentType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {EQUIPMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{EQUIPMENT_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={batchFrequency}
                    onChange={(e) => setBatchFrequency(e.target.value as QAFrequency)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>{FREQUENCY_LABELS[freq]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tests (one per line)
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder={`DSC1, Check system warm-up status, Functional, , Safety
DSC2, Verify detector uniformity, <5%, <3%, Image Quality
DSC3, Check energy window settings, Correct settings, , Setup`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">JSON File Format</h3>
                <p className="text-sm text-green-700 mb-2">
                  Upload a JSON file with an array of tests. Each test should have:
                </p>
                <pre className="text-xs bg-green-100 px-2 py-1 rounded block overflow-x-auto">
{`[
  {
    "equipment_type": "spect_ct",
    "frequency": "daily",
    "test_id": "DSC1",
    "description": "Check system warm-up",
    "tolerance": "Functional",
    "category": "Safety"
  }
]`}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload JSON File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              {jsonTests.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Preview ({jsonTests.length} tests)
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {jsonTests.slice(0, 10).map((test, i) => (
                      <div key={i} className="text-sm text-gray-600">
                        <span className="font-mono bg-gray-200 px-1 rounded">{test.test_id}</span>
                        {" - "}{test.description}
                        <span className="text-gray-400"> ({EQUIPMENT_TYPE_LABELS[test.equipment_type]}, {FREQUENCY_LABELS[test.frequency]})</span>
                      </div>
                    ))}
                    {jsonTests.length > 10 && (
                      <p className="text-sm text-gray-500 italic">...and {jsonTests.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={importMode === "text" ? handleTextImport : handleJsonImport}
              disabled={saving || (importMode === "text" ? !batchText.trim() : jsonTests.length === 0)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Importing..." : `Import ${importMode === "text" ? "Tests" : `${jsonTests.length} Tests`}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
