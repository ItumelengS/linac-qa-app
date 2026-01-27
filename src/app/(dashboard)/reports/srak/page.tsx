"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { EQUIPMENT_TYPE_LABELS, EquipmentType } from "@/types/database";

interface Equipment {
  id: string;
  name: string;
  equipment_type: EquipmentType;
}

interface SRAKMeasurement {
  id: string;
  equipment_id: string;
  source_serial?: string;
  source_radionuclide: string;
  certificate_srak: number;
  certificate_date: string;
  certificate_number?: string;
  decayed_srak?: number;
  days_since_calibration?: number;
  chamber_model?: string;
  chamber_serial?: string;
  chamber_factor_nsk: number;
  electrometer_model?: string;
  electrometer_serial?: string;
  electrometer_factor: number;
  applicator_factor?: number;
  applicator_type?: string;
  sweet_spot_position?: number;
  sweet_spot_method?: string;
  measured_temperature?: number;
  measured_pressure?: number;
  reference_temperature: number;
  reference_pressure: number;
  k_tp?: number;
  reading_1?: number;
  reading_2?: number;
  reading_3?: number;
  mean_reading?: number;
  measured_srak?: number;
  deviation_percent?: number;
  result?: string;
  measurement_date: string;
  performed_by?: string;
  notes?: string;
  created_at: string;
  equipment?: {
    name: string;
    equipment_type: EquipmentType;
  };
}

export default function SRAKReportsPage() {
  const { isLoaded } = useUser();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [measurements, setMeasurements] = useState<SRAKMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [selectedMeasurement, setSelectedMeasurement] = useState<SRAKMeasurement | null>(null);

  useEffect(() => {
    if (isLoaded) {
      fetchEquipment();
      fetchMeasurements();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (selectedEquipment) {
      fetchMeasurements(selectedEquipment);
    } else {
      fetchMeasurements();
    }
  }, [selectedEquipment]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment");
      const data = await response.json();
      // Filter to only HDR brachytherapy equipment
      const hdrEquipment = (data.equipment || []).filter(
        (eq: Equipment) => eq.equipment_type === "brachytherapy_hdr"
      );
      setEquipment(hdrEquipment);
    } catch (err) {
      console.error("Error fetching equipment:", err);
    }
  };

  const fetchMeasurements = async (equipmentId?: string) => {
    try {
      setLoading(true);
      const params = equipmentId ? `?equipment=${equipmentId}` : "";
      const response = await fetch(`/api/srak${params}`);
      const data = await response.json();
      setMeasurements(data.measurements || []);
    } catch (err) {
      console.error("Error fetching SRAK measurements:", err);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result?: string) => {
    if (!result) return null;
    const colors = {
      pass: "bg-green-100 text-green-800",
      fail: "bg-red-100 text-red-800",
      action_required: "bg-yellow-100 text-yellow-800",
    };
    const labels = {
      pass: "Pass",
      fail: "Fail",
      action_required: "Action Required",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[result as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}>
        {labels[result as keyof typeof labels] || result}
      </span>
    );
  };

  const printReport = (measurement: SRAKMeasurement) => {
    setSelectedMeasurement(measurement);
    setTimeout(() => window.print(), 100);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SRAK Reports</h1>
          <p className="text-gray-500">Source Reference Air Kerma Rate measurement records</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All HDR Brachytherapy Units</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Measurements List */}
      {measurements.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source S/N</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Sk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Measured Sk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deviation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {measurements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(m.measurement_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {m.equipment?.name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {m.source_serial || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {m.decayed_srak?.toFixed(1) || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {m.measured_srak?.toFixed(1) || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      <span className={m.deviation_percent && Math.abs(m.deviation_percent) > 3 ? "text-red-600" : "text-green-600"}>
                        {m.deviation_percent !== undefined ? `${m.deviation_percent >= 0 ? "+" : ""}${m.deviation_percent.toFixed(2)}%` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getResultBadge(m.result)}
                    </td>
                    <td className="px-4 py-3 print:hidden">
                      <button
                        onClick={() => setSelectedMeasurement(m)}
                        className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => printReport(m)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No SRAK Reports</h3>
          <p className="text-gray-500">
            Complete a quarterly source calibration (QBR4) to create SRAK reports.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMeasurement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:relative print:bg-transparent print:p-0">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
            {/* Report Header */}
            <div className="p-6 border-b print:border-b-2 print:border-black">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">SRAK Measurement Report</h2>
                  <p className="text-gray-500">Source Reference Air Kerma Rate Verification</p>
                </div>
                <button
                  onClick={() => setSelectedMeasurement(null)}
                  className="text-gray-400 hover:text-gray-600 print:hidden"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">{new Date(selectedMeasurement.measurement_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Equipment:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.equipment?.name || "Unknown"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Performed By:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.performed_by || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Result:</span>
                  <span className="ml-2">{getResultBadge(selectedMeasurement.result)}</span>
                </div>
              </div>
            </div>

            {/* Source Information */}
            <div className="p-6 border-b bg-amber-50 print:bg-amber-50">
              <h3 className="text-sm font-semibold text-amber-800 mb-3">SOURCE INFORMATION</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Radionuclide:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.source_radionuclide}</span>
                </div>
                <div>
                  <span className="text-gray-500">Source S/N:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.source_serial || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Certificate #:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.certificate_number || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Certificate Date:</span>
                  <span className="ml-2 font-medium">{new Date(selectedMeasurement.certificate_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Certificate SRAK:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.certificate_srak.toFixed(1)} μGy·m²·h⁻¹</span>
                </div>
                <div>
                  <span className="text-gray-500">Days Elapsed:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.days_since_calibration || "-"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Expected SRAK (decayed):</span>
                  <span className="ml-2 font-mono font-medium text-amber-700">{selectedMeasurement.decayed_srak?.toFixed(1) || "-"} μGy·m²·h⁻¹</span>
                </div>
              </div>
            </div>

            {/* Instrumentation */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">INSTRUMENTATION</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Well Chamber:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.chamber_model || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Chamber S/N:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.chamber_serial || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Nsk Factor:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.chamber_factor_nsk} μGy·m²·h⁻¹·nA⁻¹</span>
                </div>
                <div>
                  <span className="text-gray-500">Electrometer:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.electrometer_model || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Electrometer S/N:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.electrometer_serial || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">k_elec:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.electrometer_factor.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Applicator Type:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.applicator_type || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">k_app:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.applicator_factor?.toFixed(4) || "1.0290"}</span>
                </div>
              </div>
            </div>

            {/* Measurement Conditions */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">MEASUREMENT CONDITIONS</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Sweet Spot:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.sweet_spot_position || "-"} mm</span>
                </div>
                <div>
                  <span className="text-gray-500">Method:</span>
                  <span className="ml-2 font-medium">{selectedMeasurement.sweet_spot_method?.replace(/_/g, " ") || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.measured_temperature || "-"} °C</span>
                </div>
                <div>
                  <span className="text-gray-500">Pressure:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.measured_pressure || "-"} kPa</span>
                </div>
                <div>
                  <span className="text-gray-500">Ref Temp T₀:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.reference_temperature} °C</span>
                </div>
                <div>
                  <span className="text-gray-500">Ref Press P₀:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.reference_pressure} kPa</span>
                </div>
                <div>
                  <span className="text-gray-500">k_TP:</span>
                  <span className="ml-2 font-mono font-medium">{selectedMeasurement.k_tp?.toFixed(4) || "-"}</span>
                </div>
              </div>
            </div>

            {/* Readings */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">CHAMBER READINGS</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-gray-500 text-xs mb-1">Reading 1</div>
                  <div className="font-mono font-medium">{selectedMeasurement.reading_1?.toFixed(2) || "-"} nA</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-gray-500 text-xs mb-1">Reading 2</div>
                  <div className="font-mono font-medium">{selectedMeasurement.reading_2?.toFixed(2) || "-"} nA</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-gray-500 text-xs mb-1">Reading 3</div>
                  <div className="font-mono font-medium">{selectedMeasurement.reading_3?.toFixed(2) || "-"} nA</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-blue-600 text-xs mb-1">Mean</div>
                  <div className="font-mono font-semibold text-blue-700">{selectedMeasurement.mean_reading?.toFixed(2) || "-"} nA</div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="p-6 bg-blue-50">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">RESULTS</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-gray-500 text-xs mb-1">Expected Sk</div>
                  <div className="font-mono text-2xl font-bold text-amber-600">{selectedMeasurement.decayed_srak?.toFixed(1) || "-"}</div>
                  <div className="text-xs text-gray-400">μGy·m²·h⁻¹</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-gray-500 text-xs mb-1">Measured Sk</div>
                  <div className="font-mono text-2xl font-bold text-blue-600">{selectedMeasurement.measured_srak?.toFixed(1) || "-"}</div>
                  <div className="text-xs text-gray-400">μGy·m²·h⁻¹</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-gray-500 text-xs mb-1">Deviation</div>
                  <div className={`font-mono text-2xl font-bold ${selectedMeasurement.deviation_percent && Math.abs(selectedMeasurement.deviation_percent) > 3 ? "text-red-600" : "text-green-600"}`}>
                    {selectedMeasurement.deviation_percent !== undefined ? `${selectedMeasurement.deviation_percent >= 0 ? "+" : ""}${selectedMeasurement.deviation_percent.toFixed(2)}%` : "-"}
                  </div>
                  <div className="text-xs text-gray-400">Tolerance: ±3%</div>
                </div>
              </div>

              {/* Formula Display */}
              <div className="mt-4 p-3 bg-white rounded text-sm text-gray-600">
                <strong>Calculation:</strong> S<sub>k</sub> = M × N<sub>sk</sub> × k<sub>TP</sub> × k<sub>elec</sub> × k<sub>app</sub> = {selectedMeasurement.mean_reading?.toFixed(2)} × {selectedMeasurement.chamber_factor_nsk} × {selectedMeasurement.k_tp?.toFixed(4)} × {selectedMeasurement.electrometer_factor.toFixed(4)} × {selectedMeasurement.applicator_factor?.toFixed(4) || "1.0290"} = <strong>{selectedMeasurement.measured_srak?.toFixed(1)} μGy·m²·h⁻¹</strong>
              </div>
            </div>

            {/* Notes */}
            {selectedMeasurement.notes && (
              <div className="p-6 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">NOTES</h3>
                <p className="text-sm text-gray-600">{selectedMeasurement.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Print Report
              </button>
              <button
                onClick={() => setSelectedMeasurement(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:relative,
          .print\\:relative * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
