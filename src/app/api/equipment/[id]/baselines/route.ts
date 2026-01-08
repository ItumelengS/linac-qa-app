import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch baselines for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: equipmentId } = await params;
    const supabase = createClient();

    // Get user's profile to verify organization access
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify equipment belongs to user's organization
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id")
      .eq("id", equipmentId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Fetch current baselines only
    const { data: baselines, error } = await supabase
      .from("equipment_baselines")
      .select("*")
      .eq("equipment_id", equipmentId)
      .eq("is_current", true);

    if (error) {
      console.error("Error fetching baselines:", error);
      return NextResponse.json({ error: "Failed to fetch baselines" }, { status: 500 });
    }

    // Convert to map by test_id for easy lookup
    const baselinesMap: Record<string, {
      values: Record<string, unknown>;
      notes?: string;
      source_serial?: string;
      valid_from?: string;
    }> = {};
    baselines?.forEach((b) => {
      baselinesMap[b.test_id] = {
        values: b.values,
        notes: b.notes,
        source_serial: b.source_serial,
        valid_from: b.valid_from,
      };
    });

    return NextResponse.json({ baselines: baselinesMap });
  } catch (error) {
    console.error("Baselines GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Create new baseline (preserves history by superseding old baseline)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: equipmentId } = await params;
    const body = await request.json();
    const { test_id, values, notes, source_serial } = body;

    if (!test_id || !values) {
      return NextResponse.json({ error: "test_id and values are required" }, { status: 400 });
    }

    const supabase = createClient();

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify equipment belongs to user's organization
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id")
      .eq("id", equipmentId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Find current baseline for this equipment+test (if exists)
    const { data: currentBaseline } = await supabase
      .from("equipment_baselines")
      .select("id, values, source_serial")
      .eq("equipment_id", equipmentId)
      .eq("test_id", test_id)
      .eq("is_current", true)
      .single();

    // Check if values are actually different (avoid creating duplicate history)
    const valuesChanged = !currentBaseline ||
      JSON.stringify(currentBaseline.values) !== JSON.stringify(values) ||
      currentBaseline.source_serial !== source_serial;

    if (!valuesChanged) {
      // No change, just return current baseline
      return NextResponse.json({ baseline: currentBaseline, unchanged: true });
    }

    // Create new baseline
    const { data: newBaseline, error: insertError } = await supabase
      .from("equipment_baselines")
      .insert({
        equipment_id: equipmentId,
        test_id,
        values,
        source_serial,
        notes,
        is_current: true,
        valid_from: new Date().toISOString(),
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating baseline:", insertError);
      return NextResponse.json({ error: "Failed to save baseline" }, { status: 500 });
    }

    // If there was a previous baseline, mark it as superseded
    if (currentBaseline) {
      const { error: updateError } = await supabase
        .from("equipment_baselines")
        .update({
          is_current: false,
          valid_until: new Date().toISOString(),
          superseded_by: newBaseline.id,
        })
        .eq("id", currentBaseline.id);

      if (updateError) {
        console.error("Error updating old baseline:", updateError);
        // Non-critical, continue
      }
    }

    return NextResponse.json({ baseline: newBaseline });
  } catch (error) {
    console.error("Baselines PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove a baseline
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: equipmentId } = await params;
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("test_id");

    if (!testId) {
      return NextResponse.json({ error: "test_id is required" }, { status: 400 });
    }

    const supabase = createClient();

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify equipment belongs to user's organization
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id")
      .eq("id", equipmentId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Delete baseline
    const { error } = await supabase
      .from("equipment_baselines")
      .delete()
      .eq("equipment_id", equipmentId)
      .eq("test_id", testId);

    if (error) {
      console.error("Error deleting baseline:", error);
      return NextResponse.json({ error: "Failed to delete baseline" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Baselines DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
