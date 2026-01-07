"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  EquipmentType,
  EQUIPMENT_TYPE_LABELS,
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

export default function EquipmentPage() {
  const { user, isLoaded } = useUser();
  const [showAddForm, setShowAddForm] = useState(false);
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

  const handleEnergyChange = (
    type: "photon_energies" | "electron_energies",
    value: string
  ) => {
    const energies = value.split(",").map((e) => e.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, [type]: energies }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Equipment will be saved once organization setup is complete. Please set up your organization first.");
  };

  if (!isLoaded) {
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

      {/* Setup Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900">Organization Setup Required</h3>
            <p className="text-sm text-blue-700 mt-1">
              Equipment management will be available after your organization is set up and linked to your account.
            </p>
          </div>
        </div>
      </div>

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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add Equipment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State */}
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
    </div>
  );
}
