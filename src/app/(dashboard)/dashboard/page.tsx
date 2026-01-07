import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
      </div>

      {/* Setup Required */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="font-medium text-blue-900">Setup Your Organization</h3>
            <p className="text-blue-700 mt-1">
              To get started with SASQART QA, you need to set up your organization and add equipment.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/admin/organization"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Setup Organization
              </Link>
              <Link
                href="/equipment"
                className="inline-flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
              >
                Add Equipment
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Placeholder */}
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
              <p className="text-2xl font-bold text-gray-900">0</p>
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
              <p className="text-2xl font-bold text-gray-900">0/0</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pending Today</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
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
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Getting Started</h2>
        <ol className="space-y-3">
          <li className="flex items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium mr-3">1</span>
            <span className="text-gray-700">Set up your organization details</span>
          </li>
          <li className="flex items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm font-medium mr-3">2</span>
            <span className="text-gray-700">Add your radiation equipment (linacs, CT simulators, etc.)</span>
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
    </div>
  );
}
