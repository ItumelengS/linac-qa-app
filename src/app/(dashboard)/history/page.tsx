"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  QAReport,
  EQUIPMENT_TYPE_LABELS,
  FREQUENCY_LABELS,
} from "@/types/database";

export default function HistoryPage() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    equipmentId: "",
    qaType: "",
    dateFrom: "",
    dateTo: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
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
        let query = supabase
          .from("qa_reports")
          .select("*, equipment(*)")
          .eq("organization_id", profileData.organization_id)
          .order("date", { ascending: false })
          .limit(100);

        if (filter.equipmentId) {
          query = query.eq("equipment_id", filter.equipmentId);
        }
        if (filter.qaType) {
          query = query.eq("qa_type", filter.qaType);
        }
        if (filter.dateFrom) {
          query = query.gte("date", filter.dateFrom);
        }
        if (filter.dateTo) {
          query = query.lte("date", filter.dateTo);
        }

        const { data } = await query;
        setReports(data || []);
      }
    } catch {
      console.error("Error loading reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const getStatusBadge = (result?: string | null) => {
    switch (result) {
      case "pass":
        return "bg-green-100 text-green-800";
      case "fail":
        return "bg-red-100 text-red-800";
      case "conditional":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QA History</h1>
        <p className="text-gray-500">View past QA reports</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QA Type
            </label>
            <select
              value={filter.qaType}
              onChange={(e) => setFilter((prev) => ({ ...prev, qaType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilter({ equipmentId: "", qaType: "", dateFrom: "", dateTo: "" })
              }
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : reports.length === 0 ? (
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
          <p className="text-gray-500">
            {filter.qaType || filter.dateFrom || filter.dateTo
              ? "Try adjusting your filters."
              : "Complete your first QA to see reports here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QA Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.equipment?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.equipment?.equipment_type &&
                          EQUIPMENT_TYPE_LABELS[report.equipment.equipment_type as keyof typeof EQUIPMENT_TYPE_LABELS]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {FREQUENCY_LABELS[report.qa_type as keyof typeof FREQUENCY_LABELS]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.performer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          report.overall_result
                        )}`}
                      >
                        {report.overall_result || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          report.status === "approved"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
