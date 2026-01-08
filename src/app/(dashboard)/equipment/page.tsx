"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  EquipmentType,
  EQUIPMENT_TYPE_LABELS,
  Equipment,
  BaselineValues,
  SourceDecayBaseline,
  PositionDeviationBaseline,
  DwellTimeBaseline,
  TimerLinearityBaseline,
} from "@/types/database";

const EQUIPMENT_TYPES: EquipmentType[] = [
  "linac",
  "bore_linac",
  "linac_srs",
  "cobalt60",
  "ct_simulator",
  "conventional_simulator",
  "tps",
  "brachytherapy_hdr",
  "brachytherapy_ldr",
  "kilovoltage",
  "kilovoltage_intraop",
  "gamma_knife",
  "mlc",
  "epid",
  "record_verify",
];

// Baseline Settings Modal Component
function BaselineSettingsModal({
  equipment,
  onClose,
}: {
  equipment: Equipment;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baselines, setBaselines] = useState<Record<string, { values: BaselineValues; source_serial?: string }>>({});

  // Source data for brachytherapy
  const [sourceData, setSourceData] = useState<SourceDecayBaseline & { source_serial?: string }>({
    initial_activity: 0,
    calibration_date: "",
    unit: "Ci",
    source_serial: "",
  });

  // Position deviation defaults
  const [positionData, setPositionData] = useState<PositionDeviationBaseline>({
    expected_position: 0,
  });

  // Dwell time defaults
  const [dwellTimeData, setDwellTimeData] = useState<DwellTimeBaseline>({
    set_time: 60,
  });

  // Timer linearity defaults
  const [timerLinearityData, setTimerLinearityData] = useState<TimerLinearityBaseline>({
    time_points: [10, 30, 60, 120],
  });

  const isBrachytherapy = equipment.equipment_type === "brachytherapy_hdr" ||
                          equipment.equipment_type === "brachytherapy_ldr";

  // Fetch existing baselines
  useEffect(() => {
    const fetchBaselines = async () => {
      try {
        const response = await fetch(`/api/equipment/${equipment.id}/baselines`);
        if (response.ok) {
          const data = await response.json();
          setBaselines(data.baselines || {});

          // Pre-populate source data if exists (from DBR6 or any source decay test)
          const sourceBaseline = data.baselines?.DBR6;
          if (sourceBaseline?.values) {
            const vals = sourceBaseline.values as SourceDecayBaseline;
            setSourceData({
              initial_activity: vals.initial_activity || 0,
              calibration_date: vals.calibration_date || "",
              unit: vals.unit || "Ci",
              source_serial: sourceBaseline.source_serial || "",
            });
          }

          // Pre-populate position data (DBR10 or similar)
          const positionBaseline = data.baselines?.DBR10;
          if (positionBaseline?.values) {
            const vals = positionBaseline.values as PositionDeviationBaseline;
            setPositionData({
              expected_position: vals.expected_position || 0,
            });
          }

          // Pre-populate dwell time data (DBR11 or similar)
          const dwellBaseline = data.baselines?.DBR11;
          if (dwellBaseline?.values) {
            const vals = dwellBaseline.values as DwellTimeBaseline;
            setDwellTimeData({
              set_time: vals.set_time || 60,
            });
          }

          // Pre-populate timer linearity data (QBR7)
          const timerBaseline = data.baselines?.QBR7;
          if (timerBaseline?.values) {
            const vals = timerBaseline.values as TimerLinearityBaseline;
            setTimerLinearityData({
              time_points: vals.time_points || [10, 30, 60, 120],
            });
          }
        }
      } catch (err) {
        console.error("Error fetching baselines:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBaselines();
  }, [equipment.id]);

  const handleSaveAllBaselines = async () => {
    setSaving(true);
    try {
      const savePromises: Promise<Response>[] = [];

      if (isBrachytherapy) {
        // Save source data
        if (sourceData.initial_activity && sourceData.calibration_date) {
          const { source_serial, ...values } = sourceData;
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "DBR6",
                values,
                source_serial: source_serial || undefined,
              }),
            })
          );

          // Also save reference value for QBR4
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "QBR4",
                values: { reference_value: sourceData.initial_activity },
                source_serial: source_serial || undefined,
              }),
            })
          );
        }

        // Save position deviation data
        if (positionData.expected_position) {
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "DBR10",
                values: positionData,
              }),
            })
          );
          // Also save for QBR5 (quarterly position check)
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "QBR5",
                values: positionData,
              }),
            })
          );
          // Also save for ABR2 (annual position check)
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "ABR2",
                values: positionData,
              }),
            })
          );
        }

        // Save dwell time data
        if (dwellTimeData.set_time) {
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "DBR11",
                values: dwellTimeData,
              }),
            })
          );
          // Also save for QBR6 (quarterly timer check)
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "QBR6",
                values: dwellTimeData,
              }),
            })
          );
        }

        // Save timer linearity data
        if (timerLinearityData.time_points.length > 0) {
          savePromises.push(
            fetch(`/api/equipment/${equipment.id}/baselines`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: "QBR7",
                values: timerLinearityData,
              }),
            })
          );
        }
      }

      await Promise.all(savePromises);
      onClose();
    } catch (err) {
      console.error("Error saving baselines:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleTimePointChange = (index: number, value: string) => {
    const newPoints = [...timerLinearityData.time_points];
    newPoints[index] = parseFloat(value) || 0;
    setTimerLinearityData({ time_points: newPoints });
  };

  const addTimePoint = () => {
    setTimerLinearityData(prev => ({
      time_points: [...prev.time_points, 0],
    }));
  };

  const removeTimePoint = (index: number) => {
    setTimerLinearityData(prev => ({
      time_points: prev.time_points.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold">Equipment Baseline Settings</h2>
            <p className="text-sm text-gray-500">{equipment.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isBrachytherapy ? (
            <div className="space-y-8">
              {/* Source Data Section */}
              <div className="border-b pb-6">
                <h3 className="font-medium text-gray-900 mb-1">Source Data (Ir-192)</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Enter the source calibration data. When you replace a source, the old baseline will be preserved for history.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source Serial Number
                    </label>
                    <input
                      type="text"
                      value={sourceData.source_serial || ""}
                      onChange={(e) => setSourceData(prev => ({
                        ...prev,
                        source_serial: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., IR192-2024-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Activity
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={sourceData.initial_activity || ""}
                        onChange={(e) => setSourceData(prev => ({
                          ...prev,
                          initial_activity: parseFloat(e.target.value) || 0
                        }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., 10.5"
                      />
                      <select
                        value={sourceData.unit}
                        onChange={(e) => setSourceData(prev => ({ ...prev, unit: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Ci">Ci</option>
                        <option value="GBq">GBq</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calibration Date
                    </label>
                    <input
                      type="date"
                      value={sourceData.calibration_date}
                      onChange={(e) => setSourceData(prev => ({
                        ...prev,
                        calibration_date: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {sourceData.initial_activity > 0 && sourceData.calibration_date && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-4">
                    <p className="text-sm text-amber-800">
                      <strong>Expected today:</strong>{" "}
                      {(() => {
                        const halfLife = 73.83;
                        const decayConstant = Math.LN2 / halfLife;
                        const calDate = new Date(sourceData.calibration_date);
                        const today = new Date();
                        const daysElapsed = (today.getTime() - calDate.getTime()) / (1000 * 60 * 60 * 24);
                        const expected = sourceData.initial_activity * Math.exp(-decayConstant * daysElapsed);
                        return `${expected.toFixed(3)} ${sourceData.unit} (${Math.round(daysElapsed)} days elapsed)`;
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Position Deviation Defaults */}
              <div className="border-b pb-6">
                <h3 className="font-medium text-gray-900 mb-1">Position Deviation Defaults</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Default expected position for source position verification tests (DBR10, QBR5, ABR2).
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Position (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={positionData.expected_position || ""}
                    onChange={(e) => setPositionData({
                      expected_position: parseFloat(e.target.value) || 0
                    })}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 100.0"
                  />
                </div>
              </div>

              {/* Dwell Time Defaults */}
              <div className="border-b pb-6">
                <h3 className="font-medium text-gray-900 mb-1">Dwell Time Defaults</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Default set time for dwell time accuracy tests (DBR11, QBR6).
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Set Time (seconds)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={dwellTimeData.set_time || ""}
                    onChange={(e) => setDwellTimeData({
                      set_time: parseFloat(e.target.value) || 0
                    })}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 60.0"
                  />
                </div>
              </div>

              {/* Timer Linearity Defaults */}
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Timer Linearity Test Points</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Time points (in seconds) for timer linearity testing (QBR7).
                </p>

                <div className="space-y-2">
                  {timerLinearityData.time_points.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={point || ""}
                        onChange={(e) => handleTimePointChange(index, e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="seconds"
                      />
                      <span className="text-sm text-gray-500">seconds</span>
                      {timerLinearityData.time_points.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeTimePoint(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTimePoint}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Time Point
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Baseline settings are currently available for brachytherapy equipment.</p>
              <p className="text-sm mt-2">More equipment types coming soon.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          {isBrachytherapy && (
            <button
              onClick={handleSaveAllBaselines}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save All Settings"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const { isLoaded } = useUser();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    equipment_type: "linac" as EquipmentType,
    manufacturer: "",
    model: "",
    serial_number: "",
    location: "",
    room_number: "",
    photon_energies: [] as string[],
    electron_energies: [] as string[],
  });

  // Fetch equipment on load
  useEffect(() => {
    if (isLoaded) {
      fetchEquipment();
    }
  }, [isLoaded]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/equipment");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch equipment");
      }

      setEquipment(data.equipment || []);
    } catch (err) {
      console.error("Error fetching equipment:", err);
      setError(err instanceof Error ? err.message : "Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const handleEnergyChange = (
    type: "photon_energies" | "electron_energies",
    value: string
  ) => {
    const energies = value.split(",").map((e) => e.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, [type]: energies }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add equipment");
      }

      // Add the new equipment to the list
      setEquipment((prev) => [...prev, data.equipment]);

      // Reset form
      setFormData({
        name: "",
        equipment_type: "linac",
        manufacturer: "",
        model: "",
        serial_number: "",
        location: "",
        room_number: "",
        photon_energies: [],
        electron_energies: [],
      });
      setShowAddForm(false);
    } catch (err) {
      console.error("Error saving equipment:", err);
      setError(err instanceof Error ? err.message : "Failed to add equipment");
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-gray-500">Manage your department&apos;s equipment</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {showAddForm ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Equipment
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Equipment</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Linac 1, TrueBeam A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Type *
                </label>
                <select
                  value={formData.equipment_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      equipment_type: e.target.value as EquipmentType,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {EQUIPMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {EQUIPMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Varian, Elekta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., TrueBeam, VersaHD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serial_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location / Room
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Bunker 1, Room A"
                />
              </div>
            </div>

            {/* Energy fields for linacs */}
            {["linac", "bore_linac", "linac_srs"].includes(formData.equipment_type) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photon Energies
                  </label>
                  <input
                    type="text"
                    value={formData.photon_energies.join(", ")}
                    onChange={(e) => handleEnergyChange("photon_energies", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 6MV, 10MV, 15MV"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated values</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Electron Energies
                  </label>
                  <input
                    type="text"
                    value={formData.electron_energies.join(", ")}
                    onChange={(e) => handleEnergyChange("electron_energies", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 6MeV, 9MeV, 12MeV"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated values</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Equipment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Equipment List */}
      {equipment.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturer / Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    {item.serial_number && (
                      <div className="text-xs text-gray-500">S/N: {item.serial_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {EQUIPMENT_TYPE_LABELS[item.equipment_type]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {[item.manufacturer, item.model].filter(Boolean).join(" - ") || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.location || item.room_number || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setSelectedEquipment(item)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                      title="Settings"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment added</h3>
          <p className="text-gray-500">
            Add your first piece of equipment to start tracking QA.
          </p>
        </div>
      )}

      {/* Settings Modal */}
      {selectedEquipment && (
        <BaselineSettingsModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
        />
      )}
    </div>
  );
}
