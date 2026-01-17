import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all instruments for the organization
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fetch instruments
    const { data: instruments, error } = await supabase
      .from("instruments")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("instrument_type")
      .order("name");

    if (error) {
      console.error("Error fetching instruments:", error);
      return NextResponse.json({ error: "Failed to fetch instruments" }, { status: 500 });
    }

    return NextResponse.json({ instruments: instruments || [] });
  } catch (error) {
    console.error("Instruments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new instrument
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      instrument_type,
      name,
      manufacturer,
      model,
      serial_number,
      purchase_date,
      vendor,
      calibration_certificate,
      calibration_date,
      calibration_expiry_date,
      calibration_lab,
      calibration_factor,
      calibration_factor_unit,
      electrometer_correction,
      polarity_correction,
      recombination_correction,
      location,
      notes,
    } = body;

    if (!instrument_type || !name) {
      return NextResponse.json(
        { error: "instrument_type and name are required" },
        { status: 400 }
      );
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

    // Create instrument
    const { data: instrument, error } = await supabase
      .from("instruments")
      .insert({
        organization_id: profile.organization_id,
        instrument_type,
        name,
        manufacturer,
        model,
        serial_number,
        purchase_date: purchase_date || null,
        vendor,
        calibration_certificate,
        calibration_date: calibration_date || null,
        calibration_expiry_date: calibration_expiry_date || null,
        calibration_lab,
        calibration_factor: calibration_factor || null,
        calibration_factor_unit,
        electrometer_correction: electrometer_correction || null,
        polarity_correction: polarity_correction || null,
        recombination_correction: recombination_correction || null,
        location,
        notes,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating instrument:", error);
      return NextResponse.json({ error: "Failed to create instrument" }, { status: 500 });
    }

    return NextResponse.json({ instrument }, { status: 201 });
  } catch (error) {
    console.error("Instruments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
