"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Equipment,
  EquipmentType,
  EQUIPMENT_TYPE_LABELS,
  FREQUENCY_LABELS,
  QAFrequency,
} from "@/types/database";

// Define which frequencies are available for each equipment type
const EQUIPMENT_FREQUENCIES: Record<EquipmentType, QAFrequency[]> = {
  linac: ["daily", "monthly", "quarterly", "annual"],
  bore_linac: ["daily", "monthly", "quarterly", "annual"],
  linac_srs: ["daily", "patient_specific", "annual"],
  cobalt60: ["daily", "monthly", "annual"],
  ct_simulator: ["daily", "biannual", "annual", "biennial"],
  conventional_simulator: ["daily", "monthly", "annual"],
  tps: ["weekly", "quarterly", "biannual", "annual", "patient_specific", "commissioning"],
  brachytherapy_hdr: ["daily", "quarterly", "annual"],
  brachytherapy_ldr: ["daily", "quarterly", "annual"],
  kilovoltage: ["daily", "monthly", "annual"],
  kilovoltage_intraop: ["daily", "monthly", "biannual", "annual"],
  gamma_knife: ["daily", "monthly", "annual"],
  mlc: ["monthly", "annual"],
  epid: ["daily", "monthly", "quarterly", "annual", "as_needed"],
  record_verify: ["weekly", "patient_specific", "commissioning"],
  imrt_vmat: ["commissioning"],
  radiation_protection: ["daily", "weekly", "monthly", "annual", "biennial"],
};

export default function QAPage() {
  const { isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-medium text-red-900">Error</h3>
        <p className="text-red-700 mt-1">{error}</p>
        <button
          onClick={fetchEquipment}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QA Checklists</h1>
        <p className="text-gray-500">Select equipment and frequency to perform QA</p>
      </div>

      {equipment.length === 0 ? (
        /* No Equipment Notice */
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-yellow-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Equipment Found</h3>
          <p className="text-yellow-700 mb-4">
            Add equipment to your department before performing QA.
          </p>
          <Link
            href="/equipment"
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Add Equipment
          </Link>
        </div>
      ) : (
        /* Equipment List with QA Options */
        <div className="space-y-4">
          {equipment.map((item) => {
            const frequencies = EQUIPMENT_FREQUENCIES[item.equipment_type] || ["daily", "monthly", "annual"];

            return (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      {EQUIPMENT_TYPE_LABELS[item.equipment_type]}
                      {item.manufacturer && ` • ${item.manufacturer}`}
                      {item.model && ` ${item.model}`}
                    </p>
                  </div>
                  {item.location && (
                    <span className="text-sm text-gray-500 mt-2 md:mt-0">
                      Location: {item.location}
                    </span>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select QA Type:</p>
                  <div className="flex flex-wrap gap-2">
                    {frequencies.map((freq) => (
                      <Link
                        key={freq}
                        href={`/qa/${item.equipment_type}/${freq}?equipment=${item.id}`}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium"
                      >
                        {FREQUENCY_LABELS[freq]}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">SASQART QA Requirements</h3>
        <p className="text-sm text-blue-700">
          Select the appropriate QA frequency based on SASQART guidelines.
          Daily QA should be performed before patient treatments.
          Monthly, quarterly, and annual QA require physicist oversight.
        </p>
      </div>
    </div>
  );
}
