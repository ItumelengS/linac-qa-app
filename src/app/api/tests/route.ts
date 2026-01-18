import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Type for test input from request body
interface TestInput {
  equipment_type: string;
  test_id: string;
  frequency: string;
  description: string;
  tolerance?: string | null;
  action_level?: string | null;
  category?: string | null;
  requires_measurement?: boolean;
  measurement_unit?: string | null;
  calculator_type?: string | null;
  display_order?: number;
  is_active?: boolean;
}

// GET - Fetch all test definitions for an equipment type (or all)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipmentType = searchParams.get("equipment_type");
    const frequency = searchParams.get("frequency");
    const includeInactive = searchParams.get("include_inactive") === "true";

    const supabase = createClient();

    let query = supabase
      .from("qa_test_definitions")
      .select("*")
      .order("equipment_type")
      .order("frequency")
      .order("display_order");

    if (equipmentType) {
      query = query.eq("equipment_type", equipmentType);
    }

    if (frequency) {
      query = query.eq("frequency", frequency);
    }

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: tests, error } = await query;

    if (error) {
      console.error("Error fetching tests:", error);
      return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
    }

    return NextResponse.json({ tests: tests || [] });
  } catch (error) {
    console.error("Tests GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new test definition(s)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's profile to verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Only admins and physicists can create tests
    if (profile.role !== "admin" && profile.role !== "physicist") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();

    // Support both single test and batch insert
    const testsToInsert: TestInput[] = Array.isArray(body.tests) ? body.tests : [body];

    // Validate required fields
    for (const test of testsToInsert) {
      if (!test.equipment_type || !test.test_id || !test.frequency || !test.description) {
        return NextResponse.json(
          { error: "equipment_type, test_id, frequency, and description are required for all tests" },
          { status: 400 }
        );
      }
    }

    // Get max display_order for each equipment_type+frequency combo
    const orderMap: Record<string, number> = {};
    for (const test of testsToInsert) {
      const key = `${test.equipment_type}-${test.frequency}`;
      if (orderMap[key] === undefined) {
        const { data: maxOrder } = await supabase
          .from("qa_test_definitions")
          .select("display_order")
          .eq("equipment_type", test.equipment_type)
          .eq("frequency", test.frequency)
          .order("display_order", { ascending: false })
          .limit(1)
          .single();
        orderMap[key] = (maxOrder?.display_order || 0) + 1;
      }
    }

    // Prepare tests with display_order
    const preparedTests = testsToInsert.map((test) => {
      const key = `${test.equipment_type}-${test.frequency}`;
      const order = orderMap[key]++;
      return {
        equipment_type: test.equipment_type,
        test_id: test.test_id,
        frequency: test.frequency,
        description: test.description,
        tolerance: test.tolerance || null,
        action_level: test.action_level || null,
        category: test.category || null,
        requires_measurement: test.requires_measurement || false,
        measurement_unit: test.measurement_unit || null,
        calculator_type: test.calculator_type || null,
        display_order: test.display_order || order,
        is_active: test.is_active !== false,
      };
    });

    const { data: insertedTests, error } = await supabase
      .from("qa_test_definitions")
      .insert(preparedTests)
      .select();

    if (error) {
      console.error("Error creating tests:", error);
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A test with this equipment_type and test_id already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create tests" }, { status: 500 });
    }

    return NextResponse.json({ tests: insertedTests }, { status: 201 });
  } catch (error) {
    console.error("Tests POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
