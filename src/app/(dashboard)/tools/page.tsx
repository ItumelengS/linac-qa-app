"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  InstrumentType,
  INSTRUMENT_TYPE_LABELS,
  Instrument,
} from "@/types/database";

const INSTRUMENT_TYPES: InstrumentType[] = [
  "ion_chamber",
  "electrometer",
  "well_chamber",
  "thermometer",
  "barometer",
  "hygrometer",
  "survey_meter",
  "diode",
  "film",
  "mosfet",
  "diamond_detector",
  "scintillator",
  "phantom",
  "other",
];

// Check if calibration is expiring soon (within 30 days) or expired
function getCalibrationStatus(expiryDate?: string): "valid" | "expiring" | "expired" | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 30) return "expiring";
  return "valid";
}

export default function ToolsPage() {
  const { isLoaded } = useUser();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [filter, setFilter] = useState<InstrumentType | "all">("all");

  const [formData, setFormData] = useState({
    instrument_type: "ion_chamber" as InstrumentType,
    name: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    vendor: "",
    calibration_certificate: "",
    calibration_date: "",
    calibration_expiry_date: "",
    calibration_lab: "",
    calibration_factor: "",
    calibration_factor_unit: "",
    electrometer_correction: "",
    polarity_correction: "",
    recombination_correction: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (isLoaded) {
      fetchInstruments();
    }
  }, [isLoaded]);

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/instruments");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch instruments");
      }

      setInstruments(data.instruments || []);
    } catch (err) {
      console.error("Error fetching instruments:", err);
      setError(err instanceof Error ? err.message : "Failed to load instruments");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      instrument_type: "ion_chamber",
      name: "",
      manufacturer: "",
      model: "",
      serial_number: "",
      purchase_date: "",
      vendor: "",
      calibration_certificate: "",
      calibration_date: "",
      calibration_expiry_date: "",
      calibration_lab: "",
      calibration_factor: "",
      calibration_factor_unit: "",
      electrometer_correction: "",
      polarity_correction: "",
      recombination_correction: "",
      location: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          calibration_factor: formData.calibration_factor ? parseFloat(formData.calibration_factor) : null,
          electrometer_correction: formData.electrometer_correction ? parseFloat(formData.electrometer_correction) : null,
          polarity_correction: formData.polarity_correction ? parseFloat(formData.polarity_correction) : null,
          recombination_correction: formData.recombination_correction ? parseFloat(formData.recombination_correction) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create instrument");
      }

      setInstruments((prev) => [...prev, data.instrument]);
      resetForm();
      setShowAddForm(false);
    } catch (err) {
      console.error("Error creating instrument:", err);
      setError(err instanceof Error ? err.message : "Failed to create instrument");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (instrument: Instrument) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/instruments/${instrument.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instrument),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update instrument");
      }

      setInstruments((prev) =>
        prev.map((item) => (item.id === instrument.id ? data.instrument : item))
      );
      setEditingInstrument(null);
    } catch (err) {
      console.error("Error updating instrument:", err);
      setError(err instanceof Error ? err.message : "Failed to update instrument");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this instrument?")) return;

    try {
      const response = await fetch(`/api/instruments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete instrument");
      }

      setInstruments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting instrument:", err);
      setError(err instanceof Error ? err.message : "Failed to delete instrument");
    }
  };

  const filteredInstruments = instruments.filter(
    (inst) => filter === "all" || inst.instrument_type === filter
  );

  // Group instruments by type
  const groupedInstruments = filteredInstruments.reduce((acc, inst) => {
    const type = inst.instrument_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(inst);
    return acc;
  }, {} as Record<InstrumentType, Instrument[]>);

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
          <h1 className="text-2xl font-bold text-gray-900">QA Tools & Instruments</h1>
          <p className="text-gray-500">
            Manage your dosimetry equipment, detectors, and measurement instruments
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Instrument
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({instruments.length})
        </button>
        {INSTRUMENT_TYPES.filter((type) =>
          instruments.some((inst) => inst.instrument_type === type)
        ).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === type
                ? "bg-primary text-primary-foreground"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {INSTRUMENT_TYPE_LABELS[type]} (
            {instruments.filter((i) => i.instrument_type === type).length})
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Instrument</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrument Type *
                </label>
                <select
                  value={formData.instrument_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instrument_type: e.target.value as InstrumentType,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {INSTRUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {INSTRUMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name / Identifier *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., FC65-G #1, Keithley 6517B"
                />
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
                  placeholder="e.g., IBA, PTW, Standard Imaging"
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
                  placeholder="e.g., FC65-G, 6517B"
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
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Physics Lab, Bunker 1"
                />
              </div>
            </div>

            {/* Purchase Info */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Purchase Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchase_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Calibration Info */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Calibration Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calibration Certificate #
                  </label>
                  <input
                    type="text"
                    value={formData.calibration_certificate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calibration_certificate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calibration Date
                  </label>
                  <input
                    type="date"
                    value={formData.calibration_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calibration_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.calibration_expiry_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calibration_expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calibration Lab
                  </label>
                  <input
                    type="text"
                    value={formData.calibration_lab}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calibration_lab: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., NIST, NPL, NRC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calibration Factor
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.calibration_factor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calibration_factor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 5.432"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Factor Unit
                  </label>
                  <input
                    type="text"
                    value={formData.calibration_factor_unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calibration_factor_unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., cGy/nC, Gy/rdg"
                  />
                </div>
              </div>
            </div>

            {/* Correction factors for ion chambers */}
            {["ion_chamber", "well_chamber"].includes(formData.instrument_type) && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Correction Factors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Electrometer Correction
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.electrometer_correction}
                      onChange={(e) => setFormData((prev) => ({ ...prev, electrometer_correction: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="1.0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Polarity Correction (kpol)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.polarity_correction}
                      onChange={(e) => setFormData((prev) => ({ ...prev, polarity_correction: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="1.0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recombination Correction (ks)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.recombination_correction}
                      onChange={(e) => setFormData((prev) => ({ ...prev, recombination_correction: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="1.0000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Instrument"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Instruments List */}
      {filteredInstruments.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedInstruments).map(([type, items]) => (
            <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">
                  {INSTRUMENT_TYPE_LABELS[type as InstrumentType]} ({items.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {items.map((instrument) => {
                  const calibStatus = getCalibrationStatus(instrument.calibration_expiry_date);
                  return (
                    <div
                      key={instrument.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-gray-900">{instrument.name}</h4>
                            {!instrument.active && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                Inactive
                              </span>
                            )}
                            {calibStatus === "expired" && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                Calibration Expired
                              </span>
                            )}
                            {calibStatus === "expiring" && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                Calibration Expiring Soon
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 space-y-0.5">
                            {(instrument.manufacturer || instrument.model) && (
                              <p>
                                {[instrument.manufacturer, instrument.model].filter(Boolean).join(" - ")}
                              </p>
                            )}
                            {instrument.serial_number && <p>S/N: {instrument.serial_number}</p>}
                            {instrument.calibration_certificate && (
                              <p>Cert: {instrument.calibration_certificate}</p>
                            )}
                            {instrument.calibration_expiry_date && (
                              <p>
                                Expires: {new Date(instrument.calibration_expiry_date).toLocaleDateString()}
                              </p>
                            )}
                            {instrument.calibration_factor && (
                              <p>
                                Factor: {instrument.calibration_factor}{" "}
                                {instrument.calibration_factor_unit}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingInstrument(instrument)}
                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(instrument.id)}
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No instruments yet</h3>
          <p className="mt-2 text-gray-500">
            Add your QA instruments to track calibration certificates and expiry dates.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Instrument
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingInstrument && (
        <EditInstrumentModal
          instrument={editingInstrument}
          onClose={() => setEditingInstrument(null)}
          onSave={handleUpdate}
          saving={saving}
        />
      )}
    </div>
  );
}

// Edit Modal Component
function EditInstrumentModal({
  instrument,
  onClose,
  onSave,
  saving,
}: {
  instrument: Instrument;
  onClose: () => void;
  onSave: (instrument: Instrument) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({ ...instrument });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Instrument</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.instrument_type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, instrument_type: e.target.value as InstrumentType }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {INSTRUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INSTRUMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={formData.model || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={formData.serial_number || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, serial_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Calibration */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Calibration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate #</label>
                <input
                  type="text"
                  value={formData.calibration_certificate || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calibration_certificate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calibration Date</label>
                <input
                  type="date"
                  value={formData.calibration_date || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calibration_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.calibration_expiry_date || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calibration_expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calibration Lab</label>
                <input
                  type="text"
                  value={formData.calibration_lab || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calibration_lab: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calibration Factor</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.calibration_factor || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calibration_factor: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Factor Unit</label>
                <input
                  type="text"
                  value={formData.calibration_factor_unit || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calibration_factor_unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
