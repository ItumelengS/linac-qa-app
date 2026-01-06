export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Generate and export QA reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">QA Summary Report</h3>
          </div>
          <p className="text-gray-500 mb-4">
            Generate a summary of all QA activities for a specified period.
          </p>
          <button className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-md cursor-not-allowed">
            Coming Soon
          </button>
        </div>

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
            Export a complete package for SAHPRA regulatory inspections.
          </p>
          <button className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-md cursor-not-allowed">
            Coming Soon
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Equipment Report</h3>
          </div>
          <p className="text-gray-500 mb-4">
            Generate detailed reports for specific equipment including all QA history.
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
    </div>
  );
}
