import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List SRAK measurements for equipment
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
      .select("organization_id, role")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const equipmentId = searchParams.get("equipment");

    let query = supabase
      .from("srak_measurements")
      .select(`
        *,
        equipment:equipment_id (name, equipment_type),
        source:source_id (radionuclide, serial_number)
      `)
      .eq("organization_id", profile.organization_id)
      .order("measurement_date", { ascending: false })
      .limit(50);

    if (equipmentId) {
      query = query.eq("equipment_id", equipmentId);
    }

    const { data: measurements, error } = await query;

    if (error) {
      console.error("Error fetching SRAK measurements:", error);
      return NextResponse.json({ error: "Failed to fetch SRAK measurements" }, { status: 500 });
    }

    return NextResponse.json({ measurements: measurements || [] });
  } catch (error) {
    console.error("SRAK GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new SRAK measurement
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id, role, full_name")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Only physicists and admins can create SRAK measurements
    if (!["admin", "physicist"].includes(profile.role)) {
      return NextResponse.json({ error: "Only physicists can create SRAK measurements" }, { status: 403 });
    }

    const body = await request.json();

    // Calculate derived values
    const {
      equipment_id,
      source_id,
      source_serial,
      source_radionuclide = "Ir-192",
      certificate_srak,
      certificate_date,
      certificate_number,
      chamber_model,
      chamber_serial,
      chamber_factor_nsk,
      electrometer_model,
      electrometer_serial,
      electrometer_factor = 1.0,
      applicator_factor = 1.0,
      applicator_type,
      source_factor = 1.0,
      source_model,
      sweet_spot_position,
      sweet_spot_method,
      measured_temperature,
      measured_pressure,
      reference_temperature = 20.0,
      reference_pressure = 101.325,
      reading_1,
      reading_2,
      reading_3,
      measurement_date = new Date().toISOString().split("T")[0],
      report_id,
      notes,
    } = body;

    // Calculate days since calibration
    const certDate = new Date(certificate_date);
    const measDate = new Date(measurement_date);
    const days_since_calibration = Math.floor((measDate.getTime() - certDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate decayed SRAK (Ir-192 half-life = 73.83 days)
    const IR192_HALF_LIFE = 73.83;
    const DECAY_CONSTANT = Math.LN2 / IR192_HALF_LIFE;
    const decayed_srak = certificate_srak * Math.exp(-DECAY_CONSTANT * days_since_calibration);

    // Calculate kTP
    let k_tp = 1.0;
    if (measured_temperature && measured_pressure) {
      k_tp = ((273.15 + measured_temperature) / (273.15 + reference_temperature)) * (reference_pressure / measured_pressure);
    }

    // Calculate mean reading and measured SRAK
    const readings = [reading_1, reading_2, reading_3].filter((r) => r !== null && r !== undefined);
    const mean_reading = readings.length > 0 ? readings.reduce((a, b) => a + b, 0) / readings.length : null;

    let measured_srak = null;
    let deviation_percent = null;
    let result = null;

    if (mean_reading && chamber_factor_nsk) {
      measured_srak = mean_reading * chamber_factor_nsk * k_tp * electrometer_factor * applicator_factor * source_factor;
      deviation_percent = ((measured_srak - decayed_srak) / decayed_srak) * 100;

      // Determine result based on deviation
      const absDeviation = Math.abs(deviation_percent);
      if (absDeviation <= 3) {
        result = "pass";
      } else if (absDeviation <= 5) {
        result = "action_required";
      } else {
        result = "fail";
      }
    }

    const { data: measurement, error } = await supabase
      .from("srak_measurements")
      .insert({
        organization_id: profile.organization_id,
        equipment_id,
        report_id,
        source_id,
        source_serial,
        source_radionuclide,
        certificate_srak,
        certificate_date,
        certificate_number,
        decayed_srak,
        days_since_calibration,
        chamber_model,
        chamber_serial,
        chamber_factor_nsk,
        electrometer_model,
        electrometer_serial,
        electrometer_factor,
        applicator_factor,
        applicator_type,
        source_factor,
        source_model,
        sweet_spot_position,
        sweet_spot_method,
        measured_temperature,
        measured_pressure,
        reference_temperature,
        reference_pressure,
        k_tp,
        reading_1,
        reading_2,
        reading_3,
        mean_reading,
        measured_srak,
        deviation_percent,
        result,
        measurement_date,
        performed_by: profile.full_name,
        performed_by_id: profile.id,
        notes,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating SRAK measurement:", error);
      return NextResponse.json({ error: "Failed to create SRAK measurement" }, { status: 500 });
    }

    return NextResponse.json({ measurement, message: "SRAK measurement saved successfully" });
  } catch (error) {
    console.error("SRAK POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
