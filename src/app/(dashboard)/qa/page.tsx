"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QA Checklists</h1>
        <p className="text-gray-500">Select equipment and frequency to perform QA</p>
      </div>

      {/* Setup Notice */}
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

      {/* Available QA Types Reference */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">SASQART QA Frequencies</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
            <div key={key} className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Types Reference */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Supported Equipment Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(EQUIPMENT_TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
