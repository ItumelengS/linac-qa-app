"use client";

import { useState } from "react";
import {
  SRAKCalculator,
  SourceDecayCheckCalculator,
  PositionDeviationCalculator,
  DwellTimeCalculator,
  TimerLinearityCalculator,
  PercentageDifferenceCalculator,
  Stopwatch,
  CalculatorResult,
} from "@/components/qa-calculators";

type CalculatorCategory = "brachytherapy" | "general" | "tools";

interface CalculatorInfo {
  id: string;
  name: string;
  description: string;
  category: CalculatorCategory;
  component: React.ComponentType<{
    testId: string;
    tolerance?: string;
    actionLevel?: string;
    onUpdate: (result: CalculatorResult) => void;
  }>;
}

const calculators: CalculatorInfo[] = [
  {
    id: "srak",
    name: "SRAK Calculator",
    description: "Source Reference Air Kerma Rate calculation for HDR brachytherapy using well chamber measurements",
    category: "brachytherapy",
    component: SRAKCalculator,
  },
  {
    id: "source_decay",
    name: "Source Decay Check",
    description: "Quick Ir-192 source strength verification comparing console display to calculated decay",
    category: "brachytherapy",
    component: SourceDecayCheckCalculator,
  },
  {
    id: "position_deviation",
    name: "Position Deviation",
    description: "Calculate deviation between expected and measured positions (mm)",
    category: "general",
    component: PositionDeviationCalculator,
  },
  {
    id: "dwell_time",
    name: "Dwell Time Accuracy",
    description: "Compare set dwell time vs measured time with percentage difference",
    category: "brachytherapy",
    component: DwellTimeCalculator,
  },
  {
    id: "timer_linearity",
    name: "Timer Linearity",
    description: "Check timer accuracy across multiple time points and report max deviation",
    category: "brachytherapy",
    component: TimerLinearityCalculator,
  },
  {
    id: "percentage_difference",
    name: "Percentage Difference",
    description: "General percentage difference calculator for reference vs measured values",
    category: "general",
    component: PercentageDifferenceCalculator,
  },
];

export default function CalculatorsPage() {
  const [selectedCalculator, setSelectedCalculator] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CalculatorResult>>({});
  const [categoryFilter, setCategoryFilter] = useState<CalculatorCategory | "all">("all");
  const [showStopwatch, setShowStopwatch] = useState(false);

  const handleUpdate = (calculatorId: string) => (result: CalculatorResult) => {
    setResults((prev) => ({ ...prev, [calculatorId]: result }));
  };

  const filteredCalculators = calculators.filter(
    (calc) => categoryFilter === "all" || calc.category === categoryFilter
  );

  const brachyCalculators = filteredCalculators.filter((c) => c.category === "brachytherapy");
  const generalCalculators = filteredCalculators.filter((c) => c.category === "general");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculators</h1>
        <p className="text-gray-500">
          Standalone calculation tools for QA measurements and source verification
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            categoryFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setCategoryFilter("brachytherapy")}
          className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            categoryFilter === "brachytherapy"
              ? "bg-purple-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Brachytherapy
        </button>
        <button
          onClick={() => setCategoryFilter("general")}
          className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            categoryFilter === "general"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setCategoryFilter("tools")}
          className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            categoryFilter === "tools"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Tools
        </button>
      </div>

      {/* Brachytherapy Section */}
      {brachyCalculators.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Brachytherapy Calculators
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brachyCalculators.map((calc) => (
              <CalculatorCard
                key={calc.id}
                calculator={calc}
                isSelected={selectedCalculator === calc.id}
                onSelect={() => setSelectedCalculator(selectedCalculator === calc.id ? null : calc.id)}
                onUpdate={handleUpdate(calc.id)}
                result={results[calc.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* General Section */}
      {generalCalculators.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            General Calculators
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {generalCalculators.map((calc) => (
              <CalculatorCard
                key={calc.id}
                calculator={calc}
                isSelected={selectedCalculator === calc.id}
                onSelect={() => setSelectedCalculator(selectedCalculator === calc.id ? null : calc.id)}
                onUpdate={handleUpdate(calc.id)}
                result={results[calc.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tools Section */}
      {(categoryFilter === "all" || categoryFilter === "tools") && (
        <div>
          <h2 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tools
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stopwatch Tool */}
            <div className={`bg-white rounded-lg border-2 transition-all ${
              showStopwatch ? "border-green-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
            }`}>
              <button
                onClick={() => setShowStopwatch(!showStopwatch)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 flex items-start sm:items-center justify-between text-left gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Stopwatch</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Precision timer for dwell time measurements and QA timing tests
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${showStopwatch ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showStopwatch && (
                <div className="px-2 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
                  <div className="pt-3">
                    <Stopwatch />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalculatorCard({
  calculator,
  isSelected,
  onSelect,
  onUpdate,
  result,
}: {
  calculator: CalculatorInfo;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (result: CalculatorResult) => void;
  result?: CalculatorResult;
}) {
  const Component = calculator.component;
  const categoryColor = calculator.category === "brachytherapy" ? "purple" : "blue";

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        isSelected
          ? categoryColor === "purple"
            ? "border-purple-500 shadow-lg"
            : "border-blue-500 shadow-lg"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Header - Always visible */}
      <button
        onClick={onSelect}
        className="w-full px-3 sm:px-4 py-3 sm:py-4 flex items-start sm:items-center justify-between text-left gap-3"
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{calculator.name}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2 sm:line-clamp-none">{calculator.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {result?.status && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                result.status === "pass"
                  ? "bg-green-100 text-green-800"
                  : result.status === "fail"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {result.status.toUpperCase()}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isSelected ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Calculator - Expanded */}
      {isSelected && (
        <div className="px-2 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100 overflow-x-auto">
          <Component testId={calculator.id} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}
