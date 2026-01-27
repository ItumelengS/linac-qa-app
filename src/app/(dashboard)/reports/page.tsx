"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { FREQUENCY_LABELS, EQUIPMENT_TYPE_LABELS, EquipmentType } from "@/types/database";

interface Equipment {
  id: string;
  name: string;
  equipment_type: EquipmentType;
}

interface QAReport {
  id: string;
  equipment_id: string;
  qa_type: string;
  date: string;
  performer_name: string;
  overall_result: string;
  equipment: {
    name: string;
    equipment_type: EquipmentType;
  };
}

interface ReportStats {
  total: number;
  passed: number;
  failed: number;
  conditional: number;
}

export default function ReportsPage() {
  const { isLoaded } = useUser();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [reportData, setReportData] = useState<{
    reports: QAReport[];
    stats: ReportStats;
  } | null>(null);

  useEffect(() => {
    if (isLoaded) {
      fetchEquipment();
    }
  }, [isLoaded]);

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment");
      const data = await response.json();
      setEquipment(data.equipment || []);
    } catch (err) {
      console.error("Error fetching equipment:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateSummaryReport = async () => {
    setGenerating("summary");
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        ...(selectedEquipment && { equipment: selectedEquipment }),
      });

      const response = await fetch(`/api/reports/summary?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      setReportData(data);
    } catch (err) {
      console.error("Error generating report:", err);
      alert(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = ["Date", "Equipment", "Type", "QA Type", "Performer", "Result"];
    const rows = reportData.reports.map((r) => [
      r.date,
      r.equipment?.name || "Unknown",
      r.equipment?.equipment_type ? EQUIPMENT_TYPE_LABELS[r.equipment.equipment_type] : "",
      FREQUENCY_LABELS[r.qa_type as keyof typeof FREQUENCY_LABELS] || r.qa_type,
      r.performer_name,
      r.overall_result,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qa-report-${dateRange.from}-to-${dateRange.to}.csv`;
    link.click();
  };

  const printReport = () => {
    window.print();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Generate and export QA reports</p>
      </div>

      {/* Report Generator */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">QA Summary Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Equipment</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateSummaryReport}
              disabled={generating === "summary"}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {generating === "summary" ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6 print:space-y-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Passed</p>
              <p className="text-2xl font-bold text-green-600">{reportData.stats.passed}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{reportData.stats.failed}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Conditional</p>
              <p className="text-2xl font-bold text-yellow-600">{reportData.stats.conditional}</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 print:hidden">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </span>
            </button>
            <button
              onClick={printReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </span>
            </button>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b print:px-2">
              <h3 className="font-semibold text-gray-900">
                QA Report: {dateRange.from} to {dateRange.to}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedEquipment
                  ? equipment.find((e) => e.id === selectedEquipment)?.name
                  : "All Equipment"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2">
                      Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2">
                      QA Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2">
                      Performer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:px-2 print:py-1">
                        {new Date(report.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-1">
                        <div className="text-sm font-medium text-gray-900">
                          {report.equipment?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.equipment?.equipment_type
                            ? EQUIPMENT_TYPE_LABELS[report.equipment.equipment_type]
                            : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:px-2 print:py-1">
                        {FREQUENCY_LABELS[report.qa_type as keyof typeof FREQUENCY_LABELS] || report.qa_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:px-2 print:py-1">
                        {report.performer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:px-2 print:py-1">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            report.overall_result === "pass"
                              ? "bg-green-100 text-green-800"
                              : report.overall_result === "fail"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {report.overall_result === "pass"
                            ? "Pass"
                            : report.overall_result === "fail"
                            ? "Fail"
                            : "Conditional"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportData.reports.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No reports found for the selected criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Report Cards */}
      {!reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="/reports/srak" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">SRAK Reports</h3>
            </div>
            <p className="text-gray-500 mb-4">
              View HDR brachytherapy source calibration records with full source and instrument details.
            </p>
            <span className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              View Reports
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </a>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">SAHPRA Inspection Package</h3>
            </div>
            <p className="text-gray-500 mb-4">
              Export a complete package for SAHPRA regulatory inspections including all QA records.
            </p>
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-md cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Overdue QA Report</h3>
            </div>
            <p className="text-gray-500 mb-4">
              List all overdue QA tests that need immediate attention.
            </p>
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-md cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
