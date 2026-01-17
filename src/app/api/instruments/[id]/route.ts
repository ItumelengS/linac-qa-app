import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch a single instrument
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

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch instrument
    const { data: instrument, error } = await supabase
      .from("instruments")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (error || !instrument) {
      return NextResponse.json({ error: "Instrument not found" }, { status: 404 });
    }

    return NextResponse.json({ instrument });
  } catch (error) {
    console.error("Instrument GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update an instrument
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

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify instrument belongs to organization
    const { data: existing } = await supabase
      .from("instruments")
      .select("id")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Instrument not found" }, { status: 404 });
    }

    // Update instrument
    const { data: instrument, error } = await supabase
      .from("instruments")
      .update({
        instrument_type: body.instrument_type,
        name: body.name,
        manufacturer: body.manufacturer,
        model: body.model,
        serial_number: body.serial_number,
        purchase_date: body.purchase_date || null,
        vendor: body.vendor,
        calibration_certificate: body.calibration_certificate,
        calibration_date: body.calibration_date || null,
        calibration_expiry_date: body.calibration_expiry_date || null,
        calibration_lab: body.calibration_lab,
        calibration_factor: body.calibration_factor || null,
        calibration_factor_unit: body.calibration_factor_unit,
        electrometer_correction: body.electrometer_correction || null,
        polarity_correction: body.polarity_correction || null,
        recombination_correction: body.recombination_correction || null,
        active: body.active,
        location: body.location,
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating instrument:", error);
      return NextResponse.json({ error: "Failed to update instrument" }, { status: 500 });
    }

    return NextResponse.json({ instrument });
  } catch (error) {
    console.error("Instrument PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete an instrument
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

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Delete instrument
    const { error } = await supabase
      .from("instruments")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (error) {
      console.error("Error deleting instrument:", error);
      return NextResponse.json({ error: "Failed to delete instrument" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instrument DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
