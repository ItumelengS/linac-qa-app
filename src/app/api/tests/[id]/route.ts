import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch a single test definition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createClient();

    const { data: test, error } = await supabase
      .from("qa_test_definitions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Test GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update a test definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = createClient();

    // Get user's profile to verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "admin" && profile.role !== "physicist") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { data: test, error } = await supabase
      .from("qa_test_definitions")
      .update({
        description: body.description,
        tolerance: body.tolerance || null,
        action_level: body.action_level || null,
        category: body.category || null,
        requires_measurement: body.requires_measurement || false,
        measurement_unit: body.measurement_unit || null,
        calculator_type: body.calculator_type || null,
        display_order: body.display_order,
        is_active: body.is_active,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating test:", error);
      return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Test PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a test definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createClient();

    // Get user's profile to verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "admin" && profile.role !== "physicist") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { error } = await supabase
      .from("qa_test_definitions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting test:", error);
      return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Test DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
