"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { EQUIPMENT_TYPE_LABELS, EquipmentType } from "@/types/database";

interface Equipment {
  id: string;
  name: string;
  equipment_type: EquipmentType;
}

interface TrendDataPoint {
  date: string;
  value: number;
  baseline?: number;
  performer?: string;
}

interface TrendData {
  testId: string;
  testName: string;
  data: TrendDataPoint[];
  baseline?: number;
  tolerance?: number;
  unit?: string;
}

export default function TrendsPage() {
  const { isLoaded } = useUser();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (isLoaded) {
      fetchEquipment();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (selectedEquipment) {
      fetchTrends();
    }
  }, [selectedEquipment, dateRange]);

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

  const fetchTrends = async () => {
    if (!selectedEquipment) return;

    setLoadingTrends(true);
    try {
      const params = new URLSearchParams({
        equipment: selectedEquipment,
        from: dateRange.from,
        to: dateRange.to,
      });

      const response = await fetch(`/api/trends?${params}`);
      const data = await response.json();

      if (response.ok) {
        setTrendData(data.trends || []);
        if (data.trends?.length > 0 && !selectedTest) {
          setSelectedTest(data.trends[0].testId);
        }
      }
    } catch (err) {
      console.error("Error fetching trends:", err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const currentTrend = trendData.find((t) => t.testId === selectedTest);

  const getToleranceBounds = (baseline: number, tolerance: number) => {
    const toleranceValue = (tolerance / 100) * baseline;
    return {
      upper: baseline + toleranceValue,
      lower: baseline - toleranceValue,
    };
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
        <h1 className="text-2xl font-bold text-gray-900">Output Trends</h1>
        <p className="text-gray-500">Track measurement readings over time</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
            <select
              value={selectedEquipment}
              onChange={(e) => {
                setSelectedEquipment(e.target.value);
                setSelectedTest("");
                setTrendData([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Equipment</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({EQUIPMENT_TYPE_LABELS[eq.equipment_type]})
                </option>
              ))}
            </select>
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              disabled={trendData.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            >
              <option value="">Select Measurement</option>
              {trendData.map((trend) => (
                <option key={trend.testId} value={trend.testId}>
                  {trend.testName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loadingTrends && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading trend data...</p>
        </div>
      )}

      {/* Chart */}
      {!loadingTrends && currentTrend && currentTrend.data.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{currentTrend.testName}</h3>
            {currentTrend.baseline && (
              <p className="text-sm text-gray-500">
                Baseline: {currentTrend.baseline} {currentTrend.unit || ""}
                {currentTrend.tolerance && ` (Tolerance: ±${currentTrend.tolerance}%)`}
              </p>
            )}
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentTrend.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={
                    currentTrend.baseline && currentTrend.tolerance
                      ? [
                          (dataMin: number) => {
                            const bounds = getToleranceBounds(currentTrend.baseline!, currentTrend.tolerance!);
                            return Math.min(dataMin, bounds.lower) * 0.98;
                          },
                          (dataMax: number) => {
                            const bounds = getToleranceBounds(currentTrend.baseline!, currentTrend.tolerance!);
                            return Math.max(dataMax, bounds.upper) * 1.02;
                          },
                        ]
                      : ["auto", "auto"]
                  }
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [value.toFixed(3), currentTrend.unit || "Value"]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}
                />
                <Legend />

                {/* Tolerance bands */}
                {currentTrend.baseline && currentTrend.tolerance && (
                  <>
                    <ReferenceArea
                      y1={getToleranceBounds(currentTrend.baseline, currentTrend.tolerance).lower}
                      y2={getToleranceBounds(currentTrend.baseline, currentTrend.tolerance).upper}
                      fill="#22c55e"
                      fillOpacity={0.1}
                    />
                    <ReferenceLine
                      y={currentTrend.baseline}
                      stroke="#22c55e"
                      strokeDasharray="5 5"
                      label={{ value: "Baseline", position: "right", fill: "#22c55e", fontSize: 12 }}
                    />
                    <ReferenceLine
                      y={getToleranceBounds(currentTrend.baseline, currentTrend.tolerance).upper}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label={{ value: `+${currentTrend.tolerance}%`, position: "right", fill: "#f59e0b", fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={getToleranceBounds(currentTrend.baseline, currentTrend.tolerance).lower}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label={{ value: `-${currentTrend.tolerance}%`, position: "right", fill: "#f59e0b", fontSize: 10 }}
                    />
                  </>
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name={currentTrend.unit || "Measurement"}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deviation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Performer</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTrend.data.slice().reverse().map((point, idx) => {
                  const deviation = currentTrend.baseline
                    ? ((point.value - currentTrend.baseline) / currentTrend.baseline) * 100
                    : null;
                  const isWithinTolerance =
                    deviation !== null && currentTrend.tolerance
                      ? Math.abs(deviation) <= currentTrend.tolerance
                      : true;

                  return (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(point.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {point.value.toFixed(3)} {currentTrend.unit || ""}
                      </td>
                      <td className="px-4 py-2">
                        {deviation !== null && (
                          <span
                            className={`text-sm font-medium ${
                              isWithinTolerance ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {deviation >= 0 ? "+" : ""}
                            {deviation.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{point.performer || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingTrends && (!currentTrend || currentTrend.data.length === 0) && selectedEquipment && (
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trend Data</h3>
          <p className="text-gray-500">
            No measurement data found for the selected equipment and date range.
            Complete some QA tests to see trends here.
          </p>
        </div>
      )}

      {/* No Equipment Selected */}
      {!selectedEquipment && (
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Equipment</h3>
          <p className="text-gray-500">
            Select an equipment to view measurement trends over time.
          </p>
        </div>
      )}
    </div>
  );
}
