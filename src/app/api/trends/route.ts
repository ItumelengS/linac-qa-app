import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

// GET - Get trend data for equipment
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const equipmentId = searchParams.get("equipment");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    if (!equipmentId) {
      return NextResponse.json({ error: "Equipment ID is required" }, { status: 400 });
    }

    // Get equipment info including baselines
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name, equipment_type")
      .eq("id", equipmentId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Get equipment baselines for this equipment
    const { data: baselines } = await supabase
      .from("equipment_baselines")
      .select("test_id, baseline_values")
      .eq("equipment_id", equipmentId);

    const baselineMap = new Map<string, { baseline?: number; tolerance?: number; unit?: string }>();
    baselines?.forEach((b) => {
      const values = b.baseline_values as Record<string, number | string | undefined>;
      baselineMap.set(b.test_id, {
        baseline: values?.baseline as number | undefined,
        tolerance: values?.tolerance as number | undefined,
        unit: values?.unit as string | undefined,
      });
    });

    // Build query for QA tests with numeric results
    let query = supabase
      .from("qa_tests")
      .select(`
        id,
        test_id,
        test_name,
        result,
        created_at,
        qa_reports!inner (
          id,
          date,
          performer_name,
          equipment_id,
          organization_id
        )
      `)
      .eq("qa_reports.equipment_id", equipmentId)
      .eq("qa_reports.organization_id", profile.organization_id)
      .order("created_at", { ascending: true });

    if (fromDate) {
      query = query.gte("qa_reports.date", fromDate);
    }
    if (toDate) {
      query = query.lte("qa_reports.date", toDate);
    }

    const { data: tests, error } = await query;

    if (error) {
      console.error("Error fetching trend data:", error);
      return NextResponse.json({ error: "Failed to fetch trend data" }, { status: 500 });
    }

    // Group tests by test_id and filter for numeric results
    const testGroups = new Map<string, { testName: string; data: TrendDataPoint[] }>();

    tests?.forEach((test) => {
      // Only include tests with numeric results
      const numericValue = parseFloat(test.result);
      if (isNaN(numericValue)) return;

      const report = test.qa_reports as unknown as {
        date: string;
        performer_name: string;
      };

      if (!testGroups.has(test.test_id)) {
        testGroups.set(test.test_id, {
          testName: test.test_name,
          data: [],
        });
      }

      testGroups.get(test.test_id)!.data.push({
        date: report.date,
        value: numericValue,
        performer: report.performer_name,
      });
    });

    // Convert to array and add baseline info
    const trends: TrendData[] = [];
    testGroups.forEach((group, testId) => {
      // Only include tests with at least 2 data points for trending
      if (group.data.length >= 2) {
        const baselineInfo = baselineMap.get(testId);
        trends.push({
          testId,
          testName: group.testName,
          data: group.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          baseline: baselineInfo?.baseline,
          tolerance: baselineInfo?.tolerance,
          unit: baselineInfo?.unit,
        });
      }
    });

    // Sort trends by test name
    trends.sort((a, b) => a.testName.localeCompare(b.testName));

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Trends GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
