"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<EquipmentType | "all">("all");

  const supabase = createClient();

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileData?.organization_id) {
        const { data: equipmentData } = await supabase
          .from("equipment")
          .select("*")
          .eq("organization_id", profileData.organization_id)
          .eq("active", true)
          .order("name");

        setEquipment(equipmentData || []);
      }
    } catch {
      console.error("Error loading equipment");
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment =
    selectedType === "all"
      ? equipment
      : equipment.filter((eq) => eq.equipment_type === selectedType);

  // Get unique equipment types
  const availableTypes = [...new Set(equipment.map((eq) => eq.equipment_type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Checklists</h1>
          <p className="text-gray-500">Select equipment to perform QA</p>
        </div>

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QA Checklists</h1>
        <p className="text-gray-500">Select equipment and frequency to perform QA</p>
      </div>

      {/* Filter by type */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedType === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Equipment
        </button>
        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedType === type
                ? "bg-primary text-primary-foreground"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {EQUIPMENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Equipment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.map((eq) => {
          const frequencies = EQUIPMENT_FREQUENCIES[eq.equipment_type] || [];

          return (
            <div key={eq.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">{eq.name}</h3>
                <p className="text-sm text-gray-500">
                  {EQUIPMENT_TYPE_LABELS[eq.equipment_type]}
                </p>
                {eq.manufacturer && (
                  <p className="text-xs text-gray-400 mt-1">
                    {eq.manufacturer} {eq.model}
                  </p>
                )}
              </div>

              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  QA Checklists
                </p>
                <div className="space-y-2">
                  {frequencies.map((freq) => (
                    <Link
                      key={freq}
                      href={`/qa/${eq.equipment_type}/${freq}?equipment=${eq.id}`}
                      className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors group"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {FREQUENCY_LABELS[freq]}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
