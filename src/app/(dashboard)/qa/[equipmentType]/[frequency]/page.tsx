"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Equipment,
  EquipmentType,
  QAFrequency,
  QATestDefinition,
  QAStatus,
  CalculatorType,
  BaselineValues,
  EQUIPMENT_TYPE_LABELS,
  FREQUENCY_LABELS,
} from "@/types/database";
import { InlineCalculator, CalculatorResult } from "@/components/qa-calculators";

interface TestResult {
  test_id: string;
  status: QAStatus;
  measurement?: number;
  baseline_value?: number;
  deviation?: number;
  notes?: string;
}

// Energy-specific result for output constancy tests
interface EnergyResult {
  energy: string;
  measurement?: number;
  baseline_value?: number;
  deviation?: number;
  status: QAStatus;
}

// Detector-specific result for SPECT/CT tests
interface DetectorResult {
  detector: string; // "Detector 1", "Detector 2", etc.
  measurement?: number;
  measurement2?: number; // Some tests have UFOV and CFOV
  baseline_value?: number;
  baseline_value2?: number;
  deviation?: number;
  status: QAStatus;
}

// Check if a test is detector-specific (for SPECT/gamma cameras)
function isDetectorSpecificTest(testId: string, description: string, equipmentType: string): boolean {
  // Only applies to gamma cameras and SPECT systems
  if (!["gamma_camera", "spect", "spect_ct"].includes(equipmentType)) {
    return false;
  }

  const descLower = description.toLowerCase();
  const testIdUpper = testId.toUpperCase();

  // Daily SPECT tests that are per-detector
  if (testIdUpper === "DSC6" || descLower.includes("energy window") || descLower.includes("photopeak")) {
    return true;
  }
  if (testIdUpper === "DSC8" || descLower.includes("uniformity") && descLower.includes("flood")) {
    return true;
  }

  // Weekly SPECT tests that are per-detector
  if (testIdUpper === "WSC1" || descLower.includes("intrinsic uniformity")) {
    return true;
  }
  if (testIdUpper === "WSC3" || descLower.includes("energy resolution")) {
    return true;
  }
  if (testIdUpper === "WSC4" || descLower.includes("center of rotation") || descLower.includes("cor")) {
    return true;
  }
  if (testIdUpper === "WSC5" || descLower.includes("detector head tilt")) {
    return true;
  }

  // Quarterly SPECT tests that are per-detector
  if (testIdUpper === "QSC1" || descLower.includes("sensitivity")) {
    return true;
  }
  if (testIdUpper === "QSC2" || (descLower.includes("spatial resolution") && descLower.includes("spect"))) {
    return true;
  }

  // Annual SPECT tests that are per-detector
  if (testIdUpper === "ASC2" || descLower.includes("intrinsic spatial resolution")) {
    return true;
  }
  if (testIdUpper === "ASC3" || descLower.includes("spatial linearity")) {
    return true;
  }
  if (testIdUpper === "ASC4" || descLower.includes("count rate") || descLower.includes("dead time")) {
    return true;
  }

  return false;
}

// Get detector labels based on equipment's detector count
function getDetectorLabels(equipment: Equipment): string[] {
  const count = equipment.detector_heads || 2; // Default to dual-head
  const labels: string[] = [];
  for (let i = 1; i <= count; i++) {
    labels.push(`Detector ${i}`);
  }
  return labels;
}

// Check if a test is position-specific (for brachytherapy source positioning)
function isPositionSpecificTest(testId: string, description: string, equipmentType: string): boolean {
  // Only applies to brachytherapy equipment
  if (!["brachytherapy_hdr", "brachytherapy_ldr"].includes(equipmentType)) {
    return false;
  }

  const descLower = description.toLowerCase();
  const testIdUpper = testId.toUpperCase();

  // DBR10: Source positional accuracy
  if (testIdUpper === "DBR10" || descLower.includes("source positional accuracy") || descLower.includes("positional accuracy")) {
    return true;
  }

  return false;
}

// Get position labels based on equipment's source_position_checks setting
function getPositionLabels(equipment: Equipment): string[] {
  const count = equipment.source_position_checks || 1; // Default to 1 position
  const labels: string[] = [];
  for (let i = 1; i <= count; i++) {
    labels.push(`Position ${i}`);
  }
  return labels;
}

// Position-specific result interface
interface PositionResult {
  position: string;
  measurement?: number;
  baseline_value?: number;
  deviation?: number;
  status: QAStatus;
}

// Check if a test is energy-specific
// Returns the energy type(s) this test should be expanded for
function isEnergySpecificTest(testId: string, description: string): "photon" | "electron" | "fff" | "all" | null {
  const descLower = description.toLowerCase();
  const testIdUpper = testId.toUpperCase();

  // Daily tests - specific to photon or electron
  if (descLower.includes("output constancy") && descLower.includes("photon")) {
    return "photon";
  }
  if (descLower.includes("output constancy") && descLower.includes("electron")) {
    return "electron";
  }
  if (descLower.includes("output constancy") && (descLower.includes("fff") || descLower.includes("flattening filter free"))) {
    return "fff";
  }

  // Monthly tests that should be per-energy (all energies)
  // ML13: Beam flatness constancy
  // ML14: Beam symmetry constancy
  // ML15: Relative dosimetry constancy
  if (testIdUpper === "ML13" || testIdUpper === "ML14" || testIdUpper === "ML15") {
    return "all";
  }
  if (descLower.includes("flatness constancy") ||
      descLower.includes("symmetry constancy") ||
      descLower.includes("relative dosimetry constancy")) {
    return "all";
  }

  // Quarterly tests
  // QL1: Central axis depth dose reproducibility
  if (testIdUpper === "QL1" || descLower.includes("depth dose reproducibility")) {
    return "all";
  }

  // Annual tests that should be per-energy
  // AL6: TRS-398 calibration
  // AL7: Output factors (per energy)
  // AL10: Output vs gantry angle
  // AL11: Symmetry vs gantry angle
  if (testIdUpper === "AL6" || descLower.includes("trs-398") || descLower.includes("trs 398")) {
    return "all";
  }
  if (testIdUpper === "AL7" && descLower.includes("output factor")) {
    return "all";
  }
  if (testIdUpper === "AL10" || (descLower.includes("output") && descLower.includes("gantry"))) {
    return "all";
  }
  if (testIdUpper === "AL11" || (descLower.includes("symmetry") && descLower.includes("gantry"))) {
    return "all";
  }

  return null;
}

// Get energies from equipment based on type
function getEnergiesForTest(equipment: Equipment, energyType: "photon" | "electron" | "fff" | "all"): string[] {
  switch (energyType) {
    case "photon":
      return equipment.photon_energies || [];
    case "electron":
      return equipment.electron_energies || [];
    case "fff":
      return equipment.fff_energies || [];
    case "all":
      // Combine all energy types, with labels to distinguish
      const allEnergies: string[] = [];
      (equipment.photon_energies || []).forEach(e => allEnergies.push(e));
      (equipment.electron_energies || []).forEach(e => allEnergies.push(e));
      (equipment.fff_energies || []).forEach(e => allEnergies.push(`${e} FFF`));
      return allEnergies;
    default:
      return [];
  }
}

// Parse tolerance string to get numeric value, type, and expected value
function parseTolerance(tolerance: string | null | undefined): {
  value: number;
  isPercent: boolean;
  expectedValue?: number;
  isMaxThreshold?: boolean;
} | null {
  if (!tolerance) return null;

  // Handle "X ± Y unit" format (e.g., "0 ± 3 HU" for CT number accuracy)
  const rangeMatch = tolerance.match(/(-?\d+\.?\d*)\s*±\s*(\d+\.?\d*)\s*(\w+)?/);
  if (rangeMatch) {
    return {
      expectedValue: parseFloat(rangeMatch[1]),
      value: parseFloat(rangeMatch[2]),
      isPercent: false,
    };
  }

  // Handle max threshold format (e.g., "5 HU", "10%") - value should be less than this
  const thresholdMatch = tolerance.match(/^(\d+\.?\d*)\s*(%|HU|mm|°|lp\/cm|RED)?$/i);
  if (thresholdMatch) {
    return {
      value: parseFloat(thresholdMatch[1]),
      isPercent: thresholdMatch[2] === '%',
      isMaxThreshold: true,
    };
  }

  // Match patterns like "±3%", "±1mm", "±0.5s"
  const match = tolerance.match(/[±]?\s*(\d+\.?\d*)\s*(%|mm|s|U|µSv\/h|°)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const isPercent = match[2] === '%';

  return { value, isPercent };
}

// Calculate status based on measurement and tolerance
function calculateStatus(
  measurement: number | undefined,
  baseline: number | undefined,
  tolerance: string | null | undefined,
  actionLevel: string | null | undefined
): { status: QAStatus; deviation: number | undefined; message: string } {
  if (measurement === undefined) {
    return { status: "", deviation: undefined, message: "" };
  }

  const tol = parseTolerance(tolerance);
  const action = parseTolerance(actionLevel);

  if (!tol) {
    return { status: "", deviation: undefined, message: "Enter measurement" };
  }

  let deviation: number;
  let deviationDisplay: string;
  let absDeviation: number;

  if (tol.isPercent) {
    // For percentage tolerance, we need a baseline
    if (baseline === undefined || baseline === 0) {
      return { status: "", deviation: undefined, message: "Enter reference value" };
    }
    deviation = ((measurement - baseline) / baseline) * 100;
    absDeviation = Math.abs(deviation);
    deviationDisplay = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}%`;
  } else if (tol.isMaxThreshold) {
    // For max threshold (e.g., "5 HU" for noise), measurement should be <= threshold
    deviation = measurement;
    absDeviation = Math.abs(measurement);
    deviationDisplay = `${measurement.toFixed(2)}`;

    // For max thresholds, pass if measurement <= tolerance
    if (absDeviation <= tol.value) {
      return {
        status: "pass",
        deviation,
        message: `${deviationDisplay} (within ${tol.value} limit)`
      };
    }

    if (action && absDeviation <= action.value) {
      return {
        status: "pass",
        deviation,
        message: `${deviationDisplay} (within action level, investigate)`
      };
    }

    return {
      status: "fail",
      deviation,
      message: `${deviationDisplay} (exceeds ${action?.value || tol.value} limit)`
    };
  } else if (tol.expectedValue !== undefined) {
    // For "X ± Y" format (e.g., "0 ± 3 HU"), use expectedValue from tolerance
    const expected = baseline !== undefined ? baseline : tol.expectedValue;
    deviation = measurement - expected;
    absDeviation = Math.abs(deviation);
    deviationDisplay = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}`;
  } else {
    // For absolute tolerance with baseline, calculate deviation from baseline
    if (baseline !== undefined) {
      deviation = measurement - baseline;
      absDeviation = Math.abs(deviation);
      deviationDisplay = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}`;
    } else {
      // No baseline - measurement IS the deviation from expected (0)
      deviation = measurement;
      absDeviation = Math.abs(measurement);
      deviationDisplay = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(2)}`;
    }
  }

  // Check against tolerance and action level
  if (absDeviation <= tol.value) {
    return {
      status: "pass",
      deviation,
      message: `${deviationDisplay} (within ±${tol.value}${tol.isPercent ? '%' : ''} tolerance)`
    };
  }

  if (action && absDeviation <= action.value) {
    return {
      status: "pass",
      deviation,
      message: `${deviationDisplay} (within action level, investigate)`
    };
  }

  if (action && absDeviation > action.value) {
    return {
      status: "fail",
      deviation,
      message: `${deviationDisplay} (exceeds ±${action.value}${action.isPercent ? '%' : ''} action level)`
    };
  }

  return {
    status: "fail",
    deviation,
    message: `${deviationDisplay} (exceeds ±${tol.value}${tol.isPercent ? '%' : ''} tolerance)`
  };
}

function QAFormContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded } = useUser();

  const equipmentType = params.equipmentType as EquipmentType;
  const frequency = params.frequency as QAFrequency;
  const equipmentId = searchParams.get("equipment");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [tests, setTests] = useState<QATestDefinition[]>([]);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [energyResults, setEnergyResults] = useState<Record<string, EnergyResult[]>>({});
  const [detectorResults, setDetectorResults] = useState<Record<string, DetectorResult[]>>({});
  const [positionResults, setPositionResults] = useState<Record<string, PositionResult[]>>({});
  const [baselines, setBaselines] = useState<Record<string, { values: BaselineValues; notes?: string }>>({});
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/qa/form?equipment=${equipmentId || ""}&equipmentType=${equipmentType}&frequency=${frequency}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load QA form data");
      }

      setEquipment(data.equipment);
      setTests(data.tests || []);

      // Initialize results
      const initialResults: Record<string, TestResult> = {};
      const initialEnergyResults: Record<string, EnergyResult[]> = {};
      const initialDetectorResults: Record<string, DetectorResult[]> = {};
      const initialPositionResults: Record<string, PositionResult[]> = {};

      data.tests?.forEach((test: QATestDefinition) => {
        initialResults[test.test_id] = {
          test_id: test.test_id,
          status: "",
          measurement: undefined,
          baseline_value: undefined,
          deviation: undefined,
          notes: "",
        };

        // Initialize energy-specific results for output constancy tests
        if (data.equipment) {
          const energyType = isEnergySpecificTest(test.test_id, test.description);
          if (energyType) {
            const energies = getEnergiesForTest(data.equipment, energyType);
            initialEnergyResults[test.test_id] = energies.map(energy => ({
              energy,
              measurement: undefined,
              baseline_value: undefined,
              deviation: undefined,
              status: "" as QAStatus,
            }));
          }

          // Initialize detector-specific results for SPECT/gamma camera tests
          if (isDetectorSpecificTest(test.test_id, test.description, data.equipment.equipment_type)) {
            const detectors = getDetectorLabels(data.equipment);
            initialDetectorResults[test.test_id] = detectors.map(detector => ({
              detector,
              measurement: undefined,
              measurement2: undefined,
              baseline_value: undefined,
              baseline_value2: undefined,
              deviation: undefined,
              status: "" as QAStatus,
            }));
          }

          // Initialize position-specific results for brachytherapy source positioning tests
          if (isPositionSpecificTest(test.test_id, test.description, data.equipment.equipment_type)) {
            console.log("Equipment source_position_checks:", data.equipment.source_position_checks);
            const positions = getPositionLabels(data.equipment);
            console.log("Position labels:", positions);
            initialPositionResults[test.test_id] = positions.map(position => ({
              position,
              measurement: undefined,
              baseline_value: undefined,
              deviation: undefined,
              status: "" as QAStatus,
            }));
          }
        }
      });
      setResults(initialResults);
      setEnergyResults(initialEnergyResults);
      setDetectorResults(initialDetectorResults);
      setPositionResults(initialPositionResults);

      // Fetch baselines for this equipment and pre-populate results
      if (data.equipment?.id) {
        try {
          const baselineResponse = await fetch(`/api/equipment/${data.equipment.id}/baselines`);
          if (baselineResponse.ok) {
            const baselineData = await baselineResponse.json();
            const fetchedBaselines = baselineData.baselines || {};
            setBaselines(fetchedBaselines);

            // Pre-populate baseline values for tests that have them
            const updatedResults = { ...initialResults };
            data.tests?.forEach((test: QATestDefinition) => {
              const testBaseline = fetchedBaselines[test.test_id];
              if (testBaseline?.values) {
                const values = testBaseline.values;
                let baselineValue: number | undefined;

                // Map CT simulator baseline values to specific tests
                if (equipmentType === 'ct_simulator') {
                  // Daily HU tests
                  if (test.test_id === 'DCS2' && values.water_hu !== undefined) {
                    baselineValue = values.water_hu;
                  } else if (test.test_id === 'DCS3' && values.noise_std !== undefined) {
                    baselineValue = values.noise_std;
                  } else if (test.test_id === 'DCS4' && values.uniformity_tolerance !== undefined) {
                    baselineValue = values.uniformity_tolerance;
                  }
                  // Biennial CTDIvol tests
                  else if (test.test_id === 'BECS2' && values.ctdi_vol_reference !== undefined) {
                    baselineValue = values.ctdi_vol_reference;
                  } else if (test.test_id === 'BECS3' && values.ctdi_vol_4dct_reference !== undefined) {
                    baselineValue = values.ctdi_vol_4dct_reference;
                  }
                }

                // Map Linac baseline values
                if (equipmentType === 'linac' || equipmentType === 'bore_linac' || equipmentType === 'linac_srs') {
                  // Monthly - Beam flatness/symmetry tests
                  if (test.test_id === 'ML13' && values.reference_flatness !== undefined) {
                    baselineValue = values.reference_flatness;
                  } else if (test.test_id === 'ML14' && values.reference_symmetry !== undefined) {
                    baselineValue = values.reference_symmetry;
                  }
                  // Annual - TRS-398 calibration (AL6)
                  else if (test.test_id === 'AL6' && values.reference_dose_rate !== undefined) {
                    baselineValue = values.reference_dose_rate;
                  }
                  // Annual - Output factors (AL7) - use reference field output factor
                  else if (test.test_id === 'AL7' && values.field_sizes !== undefined) {
                    const refField = values.reference_field || '10x10';
                    baselineValue = values.field_sizes[refField] ?? 1.0;
                  }
                  // Annual - Wedge transmission (AL8) - generic baseline
                  else if (test.test_id === 'AL8' && values.wedge_factors !== undefined) {
                    // Use first wedge factor as reference
                    const wedges = Object.values(values.wedge_factors as Record<string, number>);
                    baselineValue = wedges.length > 0 ? wedges[0] : undefined;
                  }
                  // Annual - Accessory transmission (AL9) - generic baseline
                  else if (test.test_id === 'AL9' && values.accessory_factors !== undefined) {
                    // Use first accessory factor as reference
                    const accessories = Object.values(values.accessory_factors as Record<string, number>);
                    baselineValue = accessories.length > 0 ? accessories[0] : undefined;
                  }
                  // Annual - Output vs gantry angle (AL10)
                  else if (test.test_id === 'AL10' && values.reference_output_0deg !== undefined) {
                    baselineValue = values.reference_output_0deg;
                  }
                  // Annual - Symmetry vs gantry angle (AL11)
                  else if (test.test_id === 'AL11' && values.reference_symmetry_0deg !== undefined) {
                    baselineValue = values.reference_symmetry_0deg;
                  }
                  // Annual - MU linearity (AL12) - end effect as baseline
                  else if (test.test_id === 'AL12' && values.end_effect !== undefined) {
                    baselineValue = values.end_effect;
                  }
                  // Annual - MU end effect (AL13)
                  else if (test.test_id === 'AL13' && values.end_effect !== undefined) {
                    baselineValue = values.end_effect;
                  }
                  // Output constancy - stored per energy, need to check OUTPUT_* baselines
                  else if (values.reference_output !== undefined) {
                    baselineValue = values.reference_output;
                  }
                }

                // Map Cobalt-60 baseline values
                if (equipmentType === 'cobalt60') {
                  if (values.initial_activity !== undefined) {
                    baselineValue = values.initial_activity;
                  }
                }

                // Map Gamma Knife baseline values
                if (equipmentType === 'gamma_knife') {
                  if (values.dose_rate !== undefined) {
                    baselineValue = values.dose_rate;
                  }
                }

                // Map MLC baseline values
                if (equipmentType === 'mlc') {
                  if (test.test_id.includes('TRANSMISSION') && values.leaf_transmission !== undefined) {
                    baselineValue = values.leaf_transmission;
                  } else if (test.test_id.includes('LEAKAGE') && values.interleaf_leakage !== undefined) {
                    baselineValue = values.interleaf_leakage;
                  }
                }

                // Generic baseline value extraction (works for linacs, brachytherapy, etc.)
                if (baselineValue === undefined) {
                  if (values.reference_value !== undefined) {
                    baselineValue = values.reference_value;
                  } else if (values.reference_output !== undefined) {
                    baselineValue = values.reference_output;
                  } else if (values.expected_position !== undefined) {
                    baselineValue = values.expected_position;
                  } else if (values.set_time !== undefined) {
                    baselineValue = values.set_time;
                  }
                }

                if (baselineValue !== undefined) {
                  updatedResults[test.test_id] = {
                    ...updatedResults[test.test_id],
                    baseline_value: baselineValue,
                  };
                }
              }
            });
            setResults(updatedResults);

            // Pre-populate energy-specific baselines
            const updatedEnergyResults = { ...initialEnergyResults };
            data.tests?.forEach((test: QATestDefinition) => {
              const energyType = isEnergySpecificTest(test.test_id, test.description);
              if (energyType && updatedEnergyResults[test.test_id]) {
                updatedEnergyResults[test.test_id] = updatedEnergyResults[test.test_id].map(er => {
                  // Normalize energy for key (remove spaces, handle FFF)
                  const energyKey = er.energy.replace(/\s+/g, '_');

                  // For daily output constancy (DL8, DL9), use OUTPUT_<energy>
                  // For other tests, use <testId>_<energy>
                  const isDailyOutput = test.test_id.toUpperCase().startsWith('DL');
                  const baselineKey = isDailyOutput
                    ? `OUTPUT_${energyKey}`
                    : `${test.test_id}_${energyKey}`;

                  const energyBaseline = fetchedBaselines[baselineKey];
                  if (energyBaseline?.values?.reference_output !== undefined) {
                    return {
                      ...er,
                      baseline_value: energyBaseline.values.reference_output,
                    };
                  }
                  // Also check for reference_value (used by some tests)
                  if (energyBaseline?.values?.reference_value !== undefined) {
                    return {
                      ...er,
                      baseline_value: energyBaseline.values.reference_value,
                    };
                  }
                  return er;
                });
              }
            });
            setEnergyResults(updatedEnergyResults);

            // Pre-populate position-specific baselines for brachytherapy
            const updatedPositionResults = { ...initialPositionResults };
            data.tests?.forEach((test: QATestDefinition) => {
              if (isPositionSpecificTest(test.test_id, test.description, data.equipment.equipment_type) && updatedPositionResults[test.test_id]) {
                updatedPositionResults[test.test_id] = updatedPositionResults[test.test_id].map(pr => {
                  // Position keys: DBR10_Position_1, DBR10_Position_2, etc.
                  const positionKey = `${test.test_id}_${pr.position.replace(/\s+/g, '_')}`;
                  const positionBaseline = fetchedBaselines[positionKey];
                  if (positionBaseline?.values?.expected_position !== undefined) {
                    return {
                      ...pr,
                      baseline_value: positionBaseline.values.expected_position,
                    };
                  }
                  return pr;
                });
              }
            });
            setPositionResults(updatedPositionResults);
          }
        } catch (err) {
          console.error("Error fetching baselines:", err);
          // Non-critical error, continue without baselines
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [equipmentId, equipmentType, frequency]);

  useEffect(() => {
    if (isLoaded) {
      loadData();
    }
  }, [isLoaded, loadData]);

  const updateMeasurement = (testId: string, measurement: number | undefined, test: QATestDefinition) => {
    const currentResult = results[testId];
    const baseline = currentResult?.baseline_value;
    const { status, deviation, message } = calculateStatus(measurement, baseline, test.tolerance, test.action_level);

    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        measurement,
        deviation,
        status: status || prev[testId]?.status || "",
        notes: status === "fail" ? message : prev[testId]?.notes || "",
      },
    }));
  };

  const updateBaseline = (testId: string, baseline: number | undefined, test: QATestDefinition) => {
    const currentResult = results[testId];
    const measurement = currentResult?.measurement;
    const { status, deviation, message } = calculateStatus(measurement, baseline, test.tolerance, test.action_level);

    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        baseline_value: baseline,
        deviation,
        status: status || prev[testId]?.status || "",
        notes: status === "fail" ? message : prev[testId]?.notes || "",
      },
    }));
  };

  const updateStatus = (testId: string, status: QAStatus) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        status,
      },
    }));
  };

  const updateNotes = (testId: string, notes: string) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        notes,
      },
    }));
  };

  // Handlers for energy-specific tests
  const updateEnergyMeasurement = (
    testId: string,
    energy: string,
    measurement: number | undefined,
    test: QATestDefinition
  ) => {
    setEnergyResults((prev) => {
      const testResults = prev[testId] || [];
      const updatedResults = testResults.map((er) => {
        if (er.energy === energy) {
          const { status, deviation } = calculateStatus(
            measurement,
            er.baseline_value,
            test.tolerance,
            test.action_level
          );
          return {
            ...er,
            measurement,
            deviation,
            status: status || er.status,
          };
        }
        return er;
      });

      // Update overall test status based on all energy results
      const allResults = updatedResults.filter((r) => r.measurement !== undefined);
      let overallStatus: QAStatus = "";
      if (allResults.length > 0) {
        const hasFail = allResults.some((r) => r.status === "fail");
        const allPass = allResults.every((r) => r.status === "pass" || r.status === "na");
        overallStatus = hasFail ? "fail" : allPass ? "pass" : "";
      }

      // Update the main results with overall status
      setResults((prevResults) => ({
        ...prevResults,
        [testId]: {
          ...prevResults[testId],
          status: overallStatus,
        },
      }));

      return {
        ...prev,
        [testId]: updatedResults,
      };
    });
  };

  const updateEnergyBaseline = (
    testId: string,
    energy: string,
    baseline: number | undefined,
    test: QATestDefinition
  ) => {
    setEnergyResults((prev) => {
      const testResults = prev[testId] || [];
      const updatedResults = testResults.map((er) => {
        if (er.energy === energy) {
          const { status, deviation } = calculateStatus(
            er.measurement,
            baseline,
            test.tolerance,
            test.action_level
          );
          return {
            ...er,
            baseline_value: baseline,
            deviation,
            status: status || er.status,
          };
        }
        return er;
      });
      return {
        ...prev,
        [testId]: updatedResults,
      };
    });
  };

  const saveEnergyBaseline = async (testId: string, energy: string, referenceOutput: number) => {
    if (!equipment) return;

    // Normalize energy for key (remove spaces, handle FFF)
    const energyKey = energy.replace(/\s+/g, '_');

    // For daily output constancy (DL8, DL9), use OUTPUT_<energy>
    // For other tests, use <testId>_<energy>
    const isDailyOutput = testId.toUpperCase().startsWith('DL');
    const baselineKey = isDailyOutput
      ? `OUTPUT_${energyKey}`
      : `${testId}_${energyKey}`;

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: baselineKey,
          values: {
            reference_output: referenceOutput,
            measurement_date: new Date().toISOString().split("T")[0],
          },
        }),
      });

      if (response.ok) {
        setBaselines((prev) => ({
          ...prev,
          [baselineKey]: {
            values: {
              reference_output: referenceOutput,
              measurement_date: new Date().toISOString().split("T")[0],
            },
          },
        }));
      }
    } catch (err) {
      console.error("Error saving energy baseline:", err);
    }
  };

  // Handlers for detector-specific tests (SPECT/CT)
  const updateDetectorMeasurement = (
    testId: string,
    detector: string,
    measurement: number | undefined,
    test: QATestDefinition
  ) => {
    setDetectorResults((prev) => {
      const testResults = prev[testId] || [];
      const updatedResults = testResults.map((dr) => {
        if (dr.detector === detector) {
          const { status, deviation } = calculateStatus(
            measurement,
            dr.baseline_value,
            test.tolerance,
            test.action_level
          );
          return {
            ...dr,
            measurement,
            deviation,
            status: status || dr.status,
          };
        }
        return dr;
      });

      // Update overall test status based on all detector results
      const allResults = updatedResults.filter((r) => r.measurement !== undefined);
      let overallStatus: QAStatus = "";
      if (allResults.length > 0) {
        const hasFail = allResults.some((r) => r.status === "fail");
        const allPass = allResults.every((r) => r.status === "pass" || r.status === "na");
        overallStatus = hasFail ? "fail" : allPass ? "pass" : "";
      }

      // Update the main results with overall status
      setResults((prevResults) => ({
        ...prevResults,
        [testId]: {
          ...prevResults[testId],
          status: overallStatus,
        },
      }));

      return {
        ...prev,
        [testId]: updatedResults,
      };
    });
  };

  const updateDetectorBaseline = (
    testId: string,
    detector: string,
    baseline: number | undefined,
    test: QATestDefinition
  ) => {
    setDetectorResults((prev) => {
      const testResults = prev[testId] || [];
      const updatedResults = testResults.map((dr) => {
        if (dr.detector === detector) {
          const { status, deviation } = calculateStatus(
            dr.measurement,
            baseline,
            test.tolerance,
            test.action_level
          );
          return {
            ...dr,
            baseline_value: baseline,
            deviation,
            status: status || dr.status,
          };
        }
        return dr;
      });
      return {
        ...prev,
        [testId]: updatedResults,
      };
    });
  };

  const saveDetectorBaseline = async (testId: string, detector: string, referenceValue: number) => {
    if (!equipment) return;

    // Normalize detector for key (e.g., "Detector_1")
    const detectorKey = detector.replace(/\s+/g, '_');
    const baselineKey = `${testId}_${detectorKey}`;

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: baselineKey,
          values: {
            reference_value: referenceValue,
            measurement_date: new Date().toISOString().split("T")[0],
          },
        }),
      });

      if (response.ok) {
        setBaselines((prev) => ({
          ...prev,
          [baselineKey]: {
            values: {
              reference_value: referenceValue,
              measurement_date: new Date().toISOString().split("T")[0],
            },
          },
        }));
      }
    } catch (err) {
      console.error("Error saving detector baseline:", err);
    }
  };

  // Position-specific handlers for brachytherapy source positioning tests
  const updatePositionMeasurement = (
    testId: string,
    position: string,
    measurement: number | undefined,
    test: QATestDefinition
  ) => {
    setPositionResults((prev) => {
      const testResults = prev[testId] || [];
      const updatedResults = testResults.map((pr) => {
        if (pr.position === position) {
          const { status, deviation } = calculateStatus(
            measurement,
            pr.baseline_value,
            test.tolerance,
            test.action_level
          );
          return {
            ...pr,
            measurement,
            deviation,
            status: status || pr.status,
          };
        }
        return pr;
      });

      // Update overall test status based on all position results
      const allResults = updatedResults.filter((r) => r.measurement !== undefined);
      let overallStatus: QAStatus = "";
      if (allResults.length > 0) {
        const hasFail = allResults.some((r) => r.status === "fail");
        const allPass = allResults.every((r) => r.status === "pass" || r.status === "na");
        overallStatus = hasFail ? "fail" : allPass ? "pass" : "";
      }

      // Update the main results with overall status
      setResults((prevResults) => ({
        ...prevResults,
        [testId]: {
          ...prevResults[testId],
          status: overallStatus,
        },
      }));

      return {
        ...prev,
        [testId]: updatedResults,
      };
    });
  };

  const updatePositionBaseline = (
    testId: string,
    position: string,
    baseline: number | undefined,
    test: QATestDefinition
  ) => {
    setPositionResults((prev) => {
      const testResults = prev[testId] || [];
      const updatedResults = testResults.map((pr) => {
        if (pr.position === position) {
          const { status, deviation } = calculateStatus(
            pr.measurement,
            baseline,
            test.tolerance,
            test.action_level
          );
          return {
            ...pr,
            baseline_value: baseline,
            deviation,
            status: status || pr.status,
          };
        }
        return pr;
      });
      return {
        ...prev,
        [testId]: updatedResults,
      };
    });
  };

  const savePositionBaseline = async (testId: string, position: string, referenceValue: number) => {
    if (!equipment) return;

    // Normalize position for key (e.g., "Position_1")
    const positionKey = position.replace(/\s+/g, '_');
    const baselineKey = `${testId}_${positionKey}`;

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: baselineKey,
          values: {
            expected_position: referenceValue,
            measurement_date: new Date().toISOString().split("T")[0],
          },
        }),
      });

      if (response.ok) {
        setBaselines((prev) => ({
          ...prev,
          [baselineKey]: {
            values: {
              expected_position: referenceValue,
              measurement_date: new Date().toISOString().split("T")[0],
            },
          },
        }));
      }
    } catch (err) {
      console.error("Error saving position baseline:", err);
    }
  };

  // Handler for inline calculator results
  const handleCalculatorUpdate = (testId: string, result: CalculatorResult) => {
    setResults((prev) => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        measurement: result.measurement,
        baseline_value: result.baseline_value,
        deviation: result.deviation,
        status: result.status || prev[testId]?.status || "",
        notes: result.notes || prev[testId]?.notes || "",
      },
    }));
  };

  // Handler for saving baseline values
  const handleSaveBaseline = async (testId: string, values: BaselineValues) => {
    if (!equipment) return;

    try {
      const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_id: testId, values }),
      });

      if (response.ok) {
        setBaselines((prev) => ({
          ...prev,
          [testId]: { values },
        }));
      }
    } catch (err) {
      console.error("Error saving baseline:", err);
    }
  };

  // Handler for saving a single test's measurement as baseline
  const [savingBaselineFor, setSavingBaselineFor] = useState<string | null>(null);

  const handleSaveSingleBaseline = async (test: QATestDefinition) => {
    if (!equipment) return;

    const result = results[test.test_id];
    if (result?.measurement === undefined) return;

    setSavingBaselineFor(test.test_id);

    try {
      let values: BaselineValues = {};

      // Build values based on equipment type and test
      if (equipmentType === 'ct_simulator') {
        // Daily HU tests
        if (test.test_id === 'DCS2') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, water_hu: result.measurement };
        } else if (test.test_id === 'DCS3') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, noise_std: result.measurement };
        } else if (test.test_id === 'DCS4') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, uniformity_tolerance: result.measurement };
        }
        // Biennial CTDIvol tests
        else if (test.test_id === 'BECS2') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, ctdi_vol_reference: result.measurement };
        } else if (test.test_id === 'BECS3') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, ctdi_vol_4dct_reference: result.measurement };
        } else {
          values = { reference_value: result.measurement };
        }
      } else if (equipmentType === 'cobalt60') {
        const existingBaseline = baselines[test.test_id]?.values as { calibration_date?: string };
        values = {
          initial_activity: result.measurement,
          calibration_date: existingBaseline?.calibration_date || new Date().toISOString().split('T')[0],
          unit: 'Ci',
          half_life_days: 1925.2
        };
      } else if (equipmentType === 'gamma_knife') {
        values = {
          dose_rate: result.measurement,
          measurement_date: new Date().toISOString().split('T')[0]
        };
      } else if (equipmentType === 'mlc') {
        if (test.test_id.includes('TRANSMISSION')) {
          values = { leaf_transmission: result.measurement };
        } else if (test.test_id.includes('LEAKAGE')) {
          values = { interleaf_leakage: result.measurement };
        } else {
          values = { reference_value: result.measurement };
        }
      } else if (equipmentType === 'linac' || equipmentType === 'bore_linac' || equipmentType === 'linac_srs') {
        // Monthly - Linac beam flatness/symmetry
        if (test.test_id === 'ML13') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, reference_flatness: result.measurement };
        } else if (test.test_id === 'ML14') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, reference_symmetry: result.measurement };
        }
        // Annual - TRS-398 calibration (AL6)
        else if (test.test_id === 'AL6') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = {
            ...existingBaseline,
            reference_dose_rate: result.measurement,
            measurement_date: new Date().toISOString().split('T')[0],
          };
        }
        // Annual - Output factors (AL7)
        else if (test.test_id === 'AL7') {
          const existingBaseline = baselines[test.test_id]?.values as { field_sizes?: Record<string, number>; reference_field?: string } || { field_sizes: {}, reference_field: '10x10' };
          values = {
            ...existingBaseline,
            field_sizes: { ...(existingBaseline.field_sizes || {}), '10x10': result.measurement },
          };
        }
        // Annual - Wedge transmission (AL8)
        else if (test.test_id === 'AL8') {
          const existingBaseline = baselines[test.test_id]?.values as { wedge_factors?: Record<string, number> } || { wedge_factors: {} };
          values = {
            ...existingBaseline,
            wedge_factors: { ...(existingBaseline.wedge_factors || {}), default: result.measurement },
          };
        }
        // Annual - Accessory transmission (AL9)
        else if (test.test_id === 'AL9') {
          const existingBaseline = baselines[test.test_id]?.values as { accessory_factors?: Record<string, number> } || { accessory_factors: {} };
          values = {
            ...existingBaseline,
            accessory_factors: { ...(existingBaseline.accessory_factors || {}), default: result.measurement },
          };
        }
        // Annual - Output vs gantry angle (AL10)
        else if (test.test_id === 'AL10') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, reference_output_0deg: result.measurement };
        }
        // Annual - Symmetry vs gantry angle (AL11)
        else if (test.test_id === 'AL11') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, reference_symmetry_0deg: result.measurement };
        }
        // Annual - MU linearity (AL12)
        else if (test.test_id === 'AL12') {
          const existingBaseline = baselines[test.test_id]?.values || { mu_points: [5, 10, 25, 50, 100, 200, 300] };
          values = { ...existingBaseline, end_effect: result.measurement };
        }
        // Annual - MU end effect (AL13)
        else if (test.test_id === 'AL13') {
          const existingBaseline = baselines[test.test_id]?.values || {};
          values = { ...existingBaseline, end_effect: result.measurement };
        } else {
          // Generic linac test
          values = { reference_value: result.measurement };
        }
      } else {
        // Generic fallback
        values = { reference_value: result.measurement };
      }

      const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_id: test.test_id, values }),
      });

      if (response.ok) {
        setBaselines((prev) => ({
          ...prev,
          [test.test_id]: { values },
        }));
      }
    } catch (err) {
      console.error("Error saving baseline:", err);
    } finally {
      setSavingBaselineFor(null);
    }
  };

  // Handler for saving all current measurements as baselines
  const [savingBaselines, setSavingBaselines] = useState(false);
  const [baselineSaveMessage, setBaselineSaveMessage] = useState<string | null>(null);

  const handleSetAllAsBaseline = async () => {
    if (!equipment) return;

    setSavingBaselines(true);
    setBaselineSaveMessage(null);

    try {
      const testsWithMeasurements = tests.filter(
        (test) => test.requires_measurement && results[test.test_id]?.measurement !== undefined
      );

      if (testsWithMeasurements.length === 0) {
        setBaselineSaveMessage("No measurements to save as baselines");
        setSavingBaselines(false);
        return;
      }

      let savedCount = 0;
      for (const test of testsWithMeasurements) {
        const result = results[test.test_id];
        let values: BaselineValues = {};

        // Build values based on calculator type
        if (test.calculator_type === "source_decay_check") {
          // For source decay, we need initial_activity and calibration_date from current state
          const existingBaseline = baselines[test.test_id]?.values as { initial_activity?: number; calibration_date?: string };
          if (existingBaseline?.initial_activity && existingBaseline?.calibration_date) {
            values = existingBaseline; // Keep existing source data
          }
        } else if (test.calculator_type === "position_deviation") {
          values = { expected_position: result.baseline_value || result.measurement };
        } else if (test.calculator_type === "dwell_time") {
          values = { set_time: result.baseline_value || result.measurement };
        } else if (test.calculator_type === "percentage_difference") {
          values = { reference_value: result.baseline_value || result.measurement };
        } else if (test.calculator_type === "timer_linearity") {
          const existingBaseline = baselines[test.test_id]?.values as { time_points?: number[] };
          values = { time_points: existingBaseline?.time_points || [10, 30, 60, 120] };
        } else if (equipmentType === 'ct_simulator') {
          // CT Simulator specific baseline handling
          // Daily HU tests
          if (test.test_id === 'DCS2') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, water_hu: result.measurement };
          } else if (test.test_id === 'DCS3') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, noise_std: result.measurement };
          } else if (test.test_id === 'DCS4') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, uniformity_tolerance: result.measurement };
          }
          // Biennial CTDIvol tests
          else if (test.test_id === 'BECS2') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, ctdi_vol_reference: result.measurement };
          } else if (test.test_id === 'BECS3') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, ctdi_vol_4dct_reference: result.measurement };
          } else {
            values = { reference_value: result.measurement };
          }
        } else if (equipmentType === 'cobalt60') {
          // Cobalt-60: preserve calibration date, update activity
          const existingBaseline = baselines[test.test_id]?.values as { calibration_date?: string };
          values = {
            initial_activity: result.measurement,
            calibration_date: existingBaseline?.calibration_date || new Date().toISOString().split('T')[0],
            unit: 'Ci',
            half_life_days: 1925.2
          };
        } else if (equipmentType === 'gamma_knife') {
          values = {
            dose_rate: result.measurement,
            measurement_date: new Date().toISOString().split('T')[0]
          };
        } else if (equipmentType === 'mlc') {
          if (test.test_id.includes('TRANSMISSION')) {
            values = { leaf_transmission: result.measurement };
          } else if (test.test_id.includes('LEAKAGE')) {
            values = { interleaf_leakage: result.measurement };
          } else {
            values = { reference_value: result.measurement };
          }
        } else if (equipmentType === 'linac' || equipmentType === 'bore_linac' || equipmentType === 'linac_srs') {
          // Linac beam flatness/symmetry
          if (test.test_id === 'ML13') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, reference_flatness: result.measurement };
          } else if (test.test_id === 'ML14') {
            const existingBaseline = baselines[test.test_id]?.values || {};
            values = { ...existingBaseline, reference_symmetry: result.measurement };
          } else {
            // Generic linac test
            values = { reference_value: result.measurement };
          }
        } else {
          // Generic measurement-based baseline
          values = { reference_value: result.measurement };
        }

        if (Object.keys(values).length > 0) {
          const response = await fetch(`/api/equipment/${equipment.id}/baselines`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test_id: test.test_id, values }),
          });

          if (response.ok) {
            savedCount++;
            setBaselines((prev) => ({
              ...prev,
              [test.test_id]: { values },
            }));
          }
        }
      }

      setBaselineSaveMessage(`Saved ${savedCount} baseline${savedCount !== 1 ? 's' : ''} successfully`);
      setTimeout(() => setBaselineSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error saving baselines:", err);
      setBaselineSaveMessage("Error saving baselines");
    } finally {
      setSavingBaselines(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    setSaving(true);
    setError(null);

    try {
      // Build results array, expanding energy-specific, detector-specific, and position-specific tests
      const allResults: Array<{
        test_id: string;
        status: string;
        measurement?: number;
        baseline_value?: number;
        deviation?: number;
        notes?: string;
        energy?: string;
        detector?: string;
        position?: string;
      }> = [];

      tests.forEach((test) => {
        const energyType = isEnergySpecificTest(test.test_id, test.description);
        const isDetectorTest = equipment && isDetectorSpecificTest(test.test_id, test.description, equipment.equipment_type);
        const isPositionTest = equipment && isPositionSpecificTest(test.test_id, test.description, equipment.equipment_type);

        if (energyType && energyResults[test.test_id]) {
          // Add individual energy results
          energyResults[test.test_id].forEach((er) => {
            allResults.push({
              test_id: `${test.test_id}_${er.energy}`,
              status: er.status,
              measurement: er.measurement,
              baseline_value: er.baseline_value,
              deviation: er.deviation,
              energy: er.energy,
            });
          });
          // Also add the overall result for the parent test
          const parentResult = results[test.test_id];
          allResults.push({
            test_id: test.test_id,
            status: parentResult?.status || "",
            notes: parentResult?.notes,
          });
        } else if (isDetectorTest && detectorResults[test.test_id]) {
          // Add individual detector results
          detectorResults[test.test_id].forEach((dr) => {
            allResults.push({
              test_id: `${test.test_id}_${dr.detector.replace(/\s+/g, '_')}`,
              status: dr.status,
              measurement: dr.measurement,
              baseline_value: dr.baseline_value,
              deviation: dr.deviation,
              detector: dr.detector,
            });
          });
          // Also add the overall result for the parent test
          const parentResult = results[test.test_id];
          allResults.push({
            test_id: test.test_id,
            status: parentResult?.status || "",
            notes: parentResult?.notes,
          });
        } else if (isPositionTest && positionResults[test.test_id]) {
          // Add individual position results
          positionResults[test.test_id].forEach((pr) => {
            allResults.push({
              test_id: `${test.test_id}_${pr.position.replace(/\s+/g, '_')}`,
              status: pr.status,
              measurement: pr.measurement,
              baseline_value: pr.baseline_value,
              deviation: pr.deviation,
              position: pr.position,
            });
          });
          // Also add the overall result for the parent test
          const parentResult = results[test.test_id];
          allResults.push({
            test_id: test.test_id,
            status: parentResult?.status || "",
            notes: parentResult?.notes,
          });
        } else {
          // Regular test result
          const r = results[test.test_id];
          allResults.push({
            test_id: r.test_id,
            status: r.status,
            measurement: r.measurement,
            baseline_value: r.baseline_value,
            deviation: r.deviation,
            notes: r.notes,
          });
        }
      });

      const response = await fetch("/api/qa/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipment_id: equipment.id,
          qa_type: frequency,
          comments,
          results: allResults,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save QA report");
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving report:", err);
      setError(err instanceof Error ? err.message : "Failed to save QA report");
    } finally {
      setSaving(false);
    }
  };

  const setAllPass = () => {
    const newResults: Record<string, TestResult> = {};
    tests.forEach((test) => {
      // Only auto-pass functional tests (no measurement required)
      if (!test.requires_measurement) {
        newResults[test.test_id] = {
          ...results[test.test_id],
          status: "pass",
        };
      } else {
        newResults[test.test_id] = results[test.test_id];
      }
    });
    setResults(newResults);
  };

  // Group tests by category
  const testsByCategory = tests.reduce(
    (acc, test) => {
      const category = test.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(test);
      return acc;
    },
    {} as Record<string, QATestDefinition[]>
  );

  // Check if test requires percentage calculation (has % in tolerance)
  const isPercentTolerance = (tolerance: string | null | undefined) => {
    return tolerance?.includes('%') || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 mb-4">Equipment not found. Please select equipment from the QA page.</p>
        <button
          onClick={() => router.push("/qa")}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to QA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {FREQUENCY_LABELS[frequency]} QA
          </h1>
          <p className="text-gray-500">
            {equipment.name} - {EQUIPMENT_TYPE_LABELS[equipmentType]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={setAllPass}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            Mark All Functional Pass
          </button>
          <button
            onClick={handleSetAllAsBaseline}
            disabled={savingBaselines}
            className="px-3 py-2 text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {savingBaselines ? "Saving..." : "Set as Baseline"}
          </button>
          {baselineSaveMessage && (
            <span className={`text-sm px-2 py-1 rounded ${
              baselineSaveMessage.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {baselineSaveMessage}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.keys(testsByCategory).length > 0 ? (
          Object.entries(testsByCategory).map(([category, categoryTests]) => (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="divide-y">
                {categoryTests.map((test) => {
                  const result = results[test.test_id];
                  const tol = parseTolerance(test.tolerance);
                  // Show baseline input for: percentage tolerances, tolerances with embedded expected values, or pre-populated baselines
                  const hasEmbeddedExpected = tol?.expectedValue !== undefined;
                  const hasPreloadedBaseline = result?.baseline_value !== undefined;
                  const needsBaseline = test.requires_measurement && (
                    isPercentTolerance(test.tolerance) || hasEmbeddedExpected || hasPreloadedBaseline
                  );
                  // Max threshold tests (like noise/uniformity) don't need baseline comparison
                  const isThresholdTest = tol?.isMaxThreshold === true;
                  const statusColor = result?.status === "pass"
                    ? "bg-green-50 border-green-200"
                    : result?.status === "fail"
                    ? "bg-red-50 border-red-200"
                    : "";

                  return (
                    <div key={test.test_id} className={`p-4 ${statusColor} transition-colors`}>
                      <div className="flex flex-col gap-3">
                        {/* Test info */}
                        <div className="flex items-start gap-2">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono shrink-0">
                            {test.test_id}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{test.description}</p>
                            <div className="flex flex-wrap gap-3 mt-1">
                              {test.tolerance && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  Tolerance: {test.tolerance}
                                </span>
                              )}
                              {test.action_level && (
                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  Action: {test.action_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Calculator for tests with calculator_type (except position-specific tests) */}
                        {test.calculator_type && !(equipment && isPositionSpecificTest(test.test_id, test.description, equipment.equipment_type)) ? (
                          <div className="space-y-3">
                            <InlineCalculator
                              calculatorType={test.calculator_type}
                              testId={test.test_id}
                              tolerance={test.tolerance}
                              actionLevel={test.action_level}
                              initialValues={baselines[test.test_id]?.values}
                              onUpdate={(calcResult) => handleCalculatorUpdate(test.test_id, calcResult)}
                              onSaveBaseline={(values) => handleSaveBaseline(test.test_id, values)}
                            />
                            {/* Status display, override buttons, and Set as Baseline */}
                            <div className="flex flex-wrap items-center gap-3">
                              {result?.status && (
                                <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                  result.status === "pass"
                                    ? "bg-green-100 text-green-800"
                                    : result.status === "fail"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 mr-1">Override:</span>
                                {["pass", "fail", "na"].map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      result?.status === status
                                        ? status === "pass"
                                          ? "bg-green-500 text-white"
                                          : status === "fail"
                                          ? "bg-red-500 text-white"
                                          : "bg-gray-500 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : equipment && isEnergySpecificTest(test.test_id, test.description) ? (
                          /* Energy-specific test - show inputs for each energy */
                          (() => {
                            const energyType = isEnergySpecificTest(test.test_id, test.description)!;
                            const energies = getEnergiesForTest(equipment, energyType);
                            const testEnergyResults = energyResults[test.test_id] || [];

                            if (energies.length === 0) {
                              const energyLabel = energyType === "all"
                                ? "photon or electron"
                                : energyType === "fff"
                                ? "FFF"
                                : energyType;
                              return (
                                <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                                  No {energyLabel} energies configured for this equipment.
                                  <a href={`/equipment`} className="ml-1 underline">Add energies in Equipment settings.</a>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {energies.map((energy) => {
                                    const energyResult = testEnergyResults.find((er) => er.energy === energy);
                                    const energyStatusColor = energyResult?.status === "pass"
                                      ? "border-green-300 bg-green-50"
                                      : energyResult?.status === "fail"
                                      ? "border-red-300 bg-red-50"
                                      : "border-gray-200";

                                    return (
                                      <div
                                        key={energy}
                                        className={`p-3 rounded-lg border ${energyStatusColor}`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-gray-900">{energy}</span>
                                          {energyResult?.status && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              energyResult.status === "pass"
                                                ? "bg-green-100 text-green-800"
                                                : energyResult.status === "fail"
                                                ? "bg-red-100 text-red-800"
                                                : "bg-gray-100 text-gray-600"
                                            }`}>
                                              {energyResult.status === "pass" ? "PASS" : energyResult.status === "fail" ? "FAIL" : "N/A"}
                                              {energyResult.deviation !== undefined && (
                                                <span className="ml-1">
                                                  ({energyResult.deviation >= 0 ? "+" : ""}{energyResult.deviation.toFixed(2)}%)
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Reference</label>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="Ref"
                                              value={energyResult?.baseline_value ?? ""}
                                              onChange={(e) =>
                                                updateEnergyBaseline(
                                                  test.test_id,
                                                  energy,
                                                  e.target.value ? parseFloat(e.target.value) : undefined,
                                                  test
                                                )
                                              }
                                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Measured</label>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="Value"
                                              value={energyResult?.measurement ?? ""}
                                              onChange={(e) =>
                                                updateEnergyMeasurement(
                                                  test.test_id,
                                                  energy,
                                                  e.target.value ? parseFloat(e.target.value) : undefined,
                                                  test
                                                )
                                              }
                                              className={`w-full px-2 py-1.5 text-sm border rounded-md ${
                                                energyResult?.status === "pass"
                                                  ? "border-green-300"
                                                  : energyResult?.status === "fail"
                                                  ? "border-red-300"
                                                  : "border-gray-300"
                                              }`}
                                            />
                                          </div>
                                        </div>
                                        {energyResult?.measurement !== undefined && (
                                          <button
                                            type="button"
                                            onClick={() => saveEnergyBaseline(test.test_id, energy, energyResult.measurement!)}
                                            className="mt-2 w-full px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                          >
                                            Set as Baseline
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Overall status and override buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                                  {result?.status && (
                                    <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                      result.status === "pass"
                                        ? "bg-green-100 text-green-800"
                                        : result.status === "fail"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                      Overall: {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400 mr-1">Override:</span>
                                    {["pass", "fail", "na"].map((status) => (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          result?.status === status
                                            ? status === "pass"
                                              ? "bg-green-500 text-white"
                                              : status === "fail"
                                              ? "bg-red-500 text-white"
                                              : "bg-gray-500 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                      >
                                        {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : equipment && isDetectorSpecificTest(test.test_id, test.description, equipment.equipment_type) ? (
                          /* Detector-specific test - show inputs for each detector head */
                          (() => {
                            const detectors = getDetectorLabels(equipment);
                            const testDetectorResults = detectorResults[test.test_id] || [];

                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {detectors.map((detector) => {
                                    const detectorResult = testDetectorResults.find((dr) => dr.detector === detector);
                                    const detectorStatusColor = detectorResult?.status === "pass"
                                      ? "border-green-300 bg-green-50"
                                      : detectorResult?.status === "fail"
                                      ? "border-red-300 bg-red-50"
                                      : "border-gray-200";

                                    return (
                                      <div
                                        key={detector}
                                        className={`p-3 rounded-lg border ${detectorStatusColor}`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-gray-900">{detector}</span>
                                          {detectorResult?.status && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              detectorResult.status === "pass"
                                                ? "bg-green-100 text-green-800"
                                                : detectorResult.status === "fail"
                                                ? "bg-red-100 text-red-800"
                                                : "bg-gray-100 text-gray-600"
                                            }`}>
                                              {detectorResult.status === "pass" ? "PASS" : detectorResult.status === "fail" ? "FAIL" : "N/A"}
                                              {detectorResult.deviation !== undefined && (
                                                <span className="ml-1">
                                                  ({detectorResult.deviation >= 0 ? "+" : ""}{detectorResult.deviation.toFixed(2)})
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Reference</label>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="Ref"
                                              value={detectorResult?.baseline_value ?? ""}
                                              onChange={(e) =>
                                                updateDetectorBaseline(
                                                  test.test_id,
                                                  detector,
                                                  e.target.value ? parseFloat(e.target.value) : undefined,
                                                  test
                                                )
                                              }
                                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Measured</label>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="Value"
                                              value={detectorResult?.measurement ?? ""}
                                              onChange={(e) =>
                                                updateDetectorMeasurement(
                                                  test.test_id,
                                                  detector,
                                                  e.target.value ? parseFloat(e.target.value) : undefined,
                                                  test
                                                )
                                              }
                                              className={`w-full px-2 py-1.5 text-sm border rounded-md ${
                                                detectorResult?.status === "pass"
                                                  ? "border-green-300"
                                                  : detectorResult?.status === "fail"
                                                  ? "border-red-300"
                                                  : "border-gray-300"
                                              }`}
                                            />
                                          </div>
                                        </div>
                                        {detectorResult?.measurement !== undefined && (
                                          <button
                                            type="button"
                                            onClick={() => saveDetectorBaseline(test.test_id, detector, detectorResult.measurement!)}
                                            className="mt-2 w-full px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                          >
                                            Set as Baseline
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Overall status and override buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                                  {result?.status && (
                                    <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                      result.status === "pass"
                                        ? "bg-green-100 text-green-800"
                                        : result.status === "fail"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                      Overall: {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400 mr-1">Override:</span>
                                    {["pass", "fail", "na"].map((status) => (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          result?.status === status
                                            ? status === "pass"
                                              ? "bg-green-500 text-white"
                                              : status === "fail"
                                              ? "bg-red-500 text-white"
                                              : "bg-gray-500 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                      >
                                        {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : equipment && isPositionSpecificTest(test.test_id, test.description, equipment.equipment_type) ? (
                          /* Position-specific test - show inputs for each position (brachytherapy) */
                          (() => {
                            const positions = getPositionLabels(equipment);
                            console.log("Render - Equipment source_position_checks:", equipment.source_position_checks, "Positions:", positions);
                            const testPositionResults = positionResults[test.test_id] || [];

                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {positions.map((position) => {
                                    const positionResult = testPositionResults.find((pr) => pr.position === position);
                                    const positionStatusColor = positionResult?.status === "pass"
                                      ? "border-green-300 bg-green-50"
                                      : positionResult?.status === "fail"
                                      ? "border-red-300 bg-red-50"
                                      : "border-gray-200";

                                    return (
                                      <div
                                        key={position}
                                        className={`p-3 rounded-lg border ${positionStatusColor}`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-gray-900">{position}</span>
                                          {positionResult?.status && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              positionResult.status === "pass"
                                                ? "bg-green-100 text-green-800"
                                                : positionResult.status === "fail"
                                                ? "bg-red-100 text-red-800"
                                                : "bg-gray-100 text-gray-600"
                                            }`}>
                                              {positionResult.status === "pass" ? "PASS" : positionResult.status === "fail" ? "FAIL" : "N/A"}
                                              {positionResult.deviation !== undefined && (
                                                <span className="ml-1">
                                                  ({positionResult.deviation >= 0 ? "+" : ""}{positionResult.deviation.toFixed(2)})
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Expected (mm)</label>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="Ref"
                                              value={positionResult?.baseline_value ?? ""}
                                              onChange={(e) =>
                                                updatePositionBaseline(
                                                  test.test_id,
                                                  position,
                                                  e.target.value ? parseFloat(e.target.value) : undefined,
                                                  test
                                                )
                                              }
                                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Measured (mm)</label>
                                            <input
                                              type="number"
                                              step="any"
                                              placeholder="Value"
                                              value={positionResult?.measurement ?? ""}
                                              onChange={(e) =>
                                                updatePositionMeasurement(
                                                  test.test_id,
                                                  position,
                                                  e.target.value ? parseFloat(e.target.value) : undefined,
                                                  test
                                                )
                                              }
                                              className={`w-full px-2 py-1.5 text-sm border rounded-md ${
                                                positionResult?.status === "pass"
                                                  ? "border-green-300"
                                                  : positionResult?.status === "fail"
                                                  ? "border-red-300"
                                                  : "border-gray-300"
                                              }`}
                                            />
                                          </div>
                                        </div>
                                        {positionResult?.measurement !== undefined && (
                                          <button
                                            type="button"
                                            onClick={() => savePositionBaseline(test.test_id, position, positionResult.measurement!)}
                                            className="mt-2 w-full px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                          >
                                            Set as Baseline
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Overall status and override buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                                  {result?.status && (
                                    <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                      result.status === "pass"
                                        ? "bg-green-100 text-green-800"
                                        : result.status === "fail"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                      Overall: {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400 mr-1">Override:</span>
                                    {["pass", "fail", "na"].map((status) => (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          result?.status === status
                                            ? status === "pass"
                                              ? "bg-green-500 text-white"
                                              : status === "fail"
                                              ? "bg-red-500 text-white"
                                              : "bg-gray-500 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                      >
                                        {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : test.requires_measurement ? (
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                            {/* Reference/Baseline value - show for non-threshold tests that need comparison */}
                            {needsBaseline && !isThresholdTest && (
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">
                                  {hasEmbeddedExpected ? "Expected Value" : "Reference Value"}
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="Expected"
                                    value={result?.baseline_value ?? (tol?.expectedValue ?? "")}
                                    onChange={(e) =>
                                      updateBaseline(
                                        test.test_id,
                                        e.target.value ? parseFloat(e.target.value) : undefined,
                                        test
                                      )
                                    }
                                    className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50"
                                  />
                                  {test.measurement_unit && (
                                    <span className="text-xs text-gray-500">{test.measurement_unit}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Measured value */}
                            <div className="flex flex-col">
                              <label className="text-xs text-gray-500 mb-1">
                                {isThresholdTest ? "Measured Value" : needsBaseline ? "Measured Value" : "Deviation from Expected"}
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={isThresholdTest ? "Value" : needsBaseline ? "Measured" : "Deviation"}
                                  value={result?.measurement ?? ""}
                                  onChange={(e) =>
                                    updateMeasurement(
                                      test.test_id,
                                      e.target.value ? parseFloat(e.target.value) : undefined,
                                      test
                                    )
                                  }
                                  className={`w-24 px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                    result?.status === "pass"
                                      ? "border-green-300 focus:ring-green-500"
                                      : result?.status === "fail"
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-gray-300 focus:ring-primary"
                                  }`}
                                />
                                {test.measurement_unit && (
                                  <span className="text-xs text-gray-500">{test.measurement_unit}</span>
                                )}
                              </div>
                            </div>

                            {/* Auto-calculated result display */}
                            {result?.status && (
                              <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                                result.status === "pass"
                                  ? "bg-green-100 text-green-800"
                                  : result.status === "fail"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {result.status === "pass" ? "✓ PASS" : result.status === "fail" ? "✗ FAIL" : "N/A"}
                                {result.deviation !== undefined && !isThresholdTest && (
                                  <span className="ml-1 text-xs">
                                    ({result.deviation >= 0 ? "+" : ""}{result.deviation.toFixed(2)}{isPercentTolerance(test.tolerance) ? "%" : ""})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Manual override buttons */}
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400 mr-1">Override:</span>
                              {["pass", "fail", "na"].map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    result?.status === status
                                      ? status === "pass"
                                        ? "bg-green-500 text-white"
                                        : status === "fail"
                                        ? "bg-red-500 text-white"
                                        : "bg-gray-500 text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  {status === "na" ? "N/A" : status.charAt(0).toUpperCase()}
                                </button>
                              ))}
                            </div>

                            {/* Save as Baseline button */}
                            {result?.measurement !== undefined && (
                              <button
                                type="button"
                                onClick={() => handleSaveSingleBaseline(test)}
                                disabled={savingBaselineFor === test.test_id}
                                className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                title="Save current measurement as baseline"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {savingBaselineFor === test.test_id ? "Saving..." : "Set Baseline"}
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Functional test - just Pass/Fail/N/A buttons */
                          <div className="flex items-center gap-2">
                            {["pass", "fail", "na"].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateStatus(test.test_id, status as QAStatus)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                  result?.status === status
                                    ? status === "pass"
                                      ? "bg-green-500 text-white"
                                      : status === "fail"
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {status === "na" ? "N/A" : status === "pass" ? "Pass" : "Fail"}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Notes field - always show for fails, optional for others */}
                        {(result?.status === "fail" || result?.notes) && (
                          <div>
                            <input
                              type="text"
                              placeholder={result?.status === "fail" ? "Notes required for failures..." : "Additional notes..."}
                              value={result?.notes || ""}
                              onChange={(e) => updateNotes(test.test_id, e.target.value)}
                              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                                result?.status === "fail"
                                  ? "border-red-300 focus:ring-red-500 bg-red-50"
                                  : "border-gray-300 focus:ring-primary"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">
              No test definitions found for {FREQUENCY_LABELS[frequency]} QA on {EQUIPMENT_TYPE_LABELS[equipmentType]}.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Test definitions need to be added to the database.
            </p>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            General Comments / Notes
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Add any additional comments or observations..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Submit QA Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function QAFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <QAFormContent />
    </Suspense>
  );
}
