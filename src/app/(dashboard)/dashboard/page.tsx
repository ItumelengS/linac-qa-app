import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/server";
import Link from "next/link";
import { EQUIPMENT_TYPE_LABELS, FREQUENCY_LABELS } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getUserProfile();

  // Get equipment for this organization
  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .eq("active", true)
    .order("name");

  // Get recent QA reports
  const { data: recentReports } = await supabase
    .from("qa_reports")
    .select("*, equipment(*)")
    .eq("organization_id", profile?.organization_id)
    .order("date", { ascending: false })
    .limit(5);

  // Calculate QA status - what's due today
  const today = new Date().toISOString().split("T")[0];

  // Get today's completed reports
  const { data: todaysReports } = await supabase
    .from("qa_reports")
    .select("equipment_id, qa_type")
    .eq("organization_id", profile?.organization_id)
    .eq("date", today)
    .eq("qa_type", "daily");

  const completedEquipmentIds = new Set(todaysReports?.map((r) => r.equipment_id) || []);

  // Equipment requiring daily QA (linacs, cobalt, etc.)
  const dailyQAEquipment =
    equipment?.filter((e) =>
      ["linac", "cobalt60", "ct_simulator", "brachytherapy_hdr", "gamma_knife"].includes(
        e.equipment_type
      )
    ) || [];

  const pendingDailyQA = dailyQAEquipment.filter((e) => !completedEquipmentIds.has(e.id));
  const completedDailyQA = dailyQAEquipment.filter((e) => completedEquipmentIds.has(e.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">QA overview for {profile?.organizations?.name}</p>
      </div>

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
              <p className="text-2xl font-bold text-gray-900">{equipment?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Daily QA Complete</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedDailyQA.length}/{dailyQAEquipment.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${pendingDailyQA.length > 0 ? "bg-yellow-100" : "bg-green-100"}`}>
              <svg
                className={`w-6 h-6 ${pendingDailyQA.length > 0 ? "text-yellow-600" : "text-green-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pending Today</p>
              <p className="text-2xl font-bold text-gray-900">{pendingDailyQA.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{recentReports?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {pendingDailyQA.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-3">Daily QA Required</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendingDailyQA.map((eq) => (
              <Link
                key={eq.id}
                href={`/qa/${eq.equipment_type}/daily?equipment=${eq.id}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{eq.name}</p>
                  <p className="text-sm text-gray-500">{EQUIPMENT_TYPE_LABELS[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_LABELS]}</p>
                </div>
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Equipment Warning */}
      {(!equipment || equipment.length === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="font-medium text-blue-900 mb-1">No Equipment Added Yet</h3>
          <p className="text-blue-700 mb-4">Start by adding your department&apos;s equipment to begin tracking QA.</p>
          <Link
            href="/equipment"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Equipment
          </Link>
        </div>
      )}

      {/* Recent Reports */}
      {recentReports && recentReports.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Recent QA Reports</h2>
            <Link href="/history" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentReports.map((report) => (
              <div key={report.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {report.equipment?.name} - {FREQUENCY_LABELS[report.qa_type as keyof typeof FREQUENCY_LABELS]} QA
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(report.date).toLocaleDateString()} by {report.performer_name}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.overall_result === "pass"
                      ? "bg-green-100 text-green-800"
                      : report.overall_result === "fail"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {report.overall_result || report.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Overview */}
      {equipment && equipment.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Equipment</h2>
            <Link href="/equipment" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </div>
          <div className="divide-y">
            {equipment.slice(0, 5).map((eq) => (
              <div key={eq.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{eq.name}</p>
                  <p className="text-sm text-gray-500">
                    {EQUIPMENT_TYPE_LABELS[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_LABELS]}
                    {eq.manufacturer && ` - ${eq.manufacturer}`}
                    {eq.model && ` ${eq.model}`}
                  </p>
                </div>
                <Link
                  href={`/qa/${eq.equipment_type}/daily?equipment=${eq.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Start QA
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
