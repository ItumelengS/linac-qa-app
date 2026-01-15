"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Organization } from "@/types/database";

interface DashboardStats {
  equipmentCount: number;
  dailyQACompleted: number;
  dailyQATotal: number;
  pendingReviews: number;
  monthlyReportCount: number;
}

interface SetupStatus {
  hasOrganization: boolean;
  hasEquipment: boolean;
  isComplete: boolean;
}

interface BrachySource {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  source_serial?: string;
  initial_activity?: number;
  calibration_date?: string;
  unit?: string;
  current_activity?: number;
  days_elapsed?: number;
}

interface DashboardData {
  organization: Organization | null;
  stats: DashboardStats;
  setupStatus: SetupStatus;
  recentReports: Array<{
    id: string;
    qa_type: string;
    date: string;
    status: string;
    equipment: { name: string; equipment_type: string } | null;
  }>;
  brachySources: BrachySource[];
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (isLoaded) {
      fetchDashboard();
    }
  }, [isLoaded]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch dashboard");
      }

      setData(result);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
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
        <h3 className="font-medium text-red-900">Error loading dashboard</h3>
        <p className="text-red-700 mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { organization, stats, setupStatus, recentReports, brachySources } = data || {
    organization: null,
    stats: { equipmentCount: 0, dailyQACompleted: 0, dailyQATotal: 0, pendingReviews: 0, monthlyReportCount: 0 },
    setupStatus: { hasOrganization: false, hasEquipment: false, isComplete: false },
    recentReports: [],
    brachySources: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          {organization?.name && !organization.name.includes("'s Organization") && (
            <span className="ml-2 text-gray-400">• {organization.name}</span>
          )}
        </p>
      </div>

      {/* Setup Required - Only show if setup is incomplete */}
      {!setupStatus.isComplete && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-blue-900">Complete Your Setup</h3>
              <p className="text-blue-700 mt-1">
                {!setupStatus.hasOrganization && !setupStatus.hasEquipment
                  ? "Set up your organization and add equipment to start using SASQART QA."
                  : !setupStatus.hasOrganization
                  ? "Update your organization details to complete setup."
                  : "Add equipment to start performing QA checklists."}
              </p>
              <div className="mt-4 flex gap-3">
                {!setupStatus.hasOrganization && (
                  <Link
                    href="/admin/organization"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Setup Organization
                  </Link>
                )}
                {!setupStatus.hasEquipment && (
                  <Link
                    href="/equipment"
                    className="inline-flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Add Equipment
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Equipment</p>
              <p className="text-2xl font-bold text-gray-900">{stats.equipmentCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stats.dailyQACompleted === stats.dailyQATotal && stats.dailyQATotal > 0 ? "bg-green-100" : "bg-yellow-100"}`}>
              <svg className={`w-6 h-6 ${stats.dailyQACompleted === stats.dailyQATotal && stats.dailyQATotal > 0 ? "text-green-600" : "text-yellow-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Daily QA Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dailyQACompleted}/{stats.dailyQATotal}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stats.pendingReviews > 0 ? "bg-orange-100" : "bg-green-100"}`}>
              <svg className={`w-6 h-6 ${stats.pendingReviews > 0 ? "text-orange-600" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Reports This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyReportCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Brachytherapy Source Activity */}
      {brachySources && brachySources.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-amber-50 rounded-lg shadow p-4 sm:p-6 border border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 className="font-semibold text-purple-900">Brachytherapy Source Activity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {brachySources.map((source) => (
              <div key={source.equipment_id} className="bg-white rounded-lg p-3 sm:p-4 border border-purple-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{source.equipment_name}</h3>
                    {source.source_serial && (
                      <p className="text-xs text-gray-500 truncate">S/N: {source.source_serial}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap self-start">
                    {source.equipment_type === "brachytherapy_hdr" ? "HDR" : "LDR"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-500">Current:</span>
                    <span className="text-lg sm:text-xl font-bold text-amber-600">
                      {source.current_activity?.toFixed(2)} {source.unit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs sm:text-sm">
                    <span className="text-gray-400">Initial:</span>
                    <span className="text-gray-600">
                      {source.initial_activity?.toFixed(2)} {source.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                    <span>{source.days_elapsed} days elapsed</span>
                    <span>{source.calibration_date && new Date(source.calibration_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link
              href="/calculators"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-700 bg-white border border-purple-200 rounded-md hover:bg-purple-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Open Calculators
            </Link>
            <Link
              href="/qa"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Daily QA
            </Link>
          </div>
        </div>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent QA Reports</h2>
          {recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{report.equipment?.name || "Unknown Equipment"}</p>
                    <p className="text-sm text-gray-500 capitalize">{report.qa_type} QA • {new Date(report.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === "approved" ? "bg-green-100 text-green-800" :
                    report.status === "submitted" ? "bg-blue-100 text-blue-800" :
                    report.status === "rejected" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No reports yet. Start by performing a QA checklist.</p>
          )}
          {recentReports.length > 0 && (
            <Link href="/history" className="block text-center text-primary hover:underline mt-4 text-sm">
              View All Reports
            </Link>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/qa"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Perform QA</p>
                <p className="text-sm text-gray-500">Start a new QA checklist</p>
              </div>
            </Link>

            <Link
              href="/equipment"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Manage Equipment</p>
                <p className="text-sm text-gray-500">Add or edit equipment</p>
              </div>
            </Link>

            <Link
              href="/trends"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">View Trends</p>
                <p className="text-sm text-gray-500">Analyze QA data over time</p>
              </div>
            </Link>

            <Link
              href="/reports"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Generate Reports</p>
                <p className="text-sm text-gray-500">Create compliance reports</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Getting Started - Only show if not complete */}
      {!setupStatus.isComplete && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Getting Started</h2>
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium mr-3 ${
                setupStatus.hasOrganization ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
              }`}>
                {setupStatus.hasOrganization ? "✓" : "1"}
              </span>
              <span className={setupStatus.hasOrganization ? "text-gray-400 line-through" : "text-gray-700"}>
                Set up your organization details
              </span>
            </li>
            <li className="flex items-start">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium mr-3 ${
                setupStatus.hasEquipment ? "bg-green-500 text-white" : setupStatus.hasOrganization ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-600"
              }`}>
                {setupStatus.hasEquipment ? "✓" : "2"}
              </span>
              <span className={setupStatus.hasEquipment ? "text-gray-400 line-through" : "text-gray-700"}>
                Add your radiation equipment (linacs, CT simulators, etc.)
              </span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-medium mr-3">3</span>
              <span className="text-gray-700">Start performing daily QA checklists</span>
            </li>
            <li className="flex items-start">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-medium mr-3">4</span>
              <span className="text-gray-700">View trends and generate compliance reports</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
