export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Output Trends</h1>
        <p className="text-gray-500">Track output readings over time</p>
      </div>

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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-500">
          Output trend charts with tolerance bands will be available here.
          Start recording daily output readings to see trends.
        </p>
      </div>
    </div>
  );
}
