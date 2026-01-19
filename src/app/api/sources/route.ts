import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SourceStatus, SourceCategory, SourceForm } from "@/types/database";

// GET - List all radioactive sources for the organization
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ sources: [] });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const radionuclide = searchParams.get("radionuclide");

    // Build query - use the view for calculated activity
    let query = supabase
      .from("sources_with_activity")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("license_item_number", { ascending: true, nullsFirst: false })
      .order("radionuclide");

    if (status) {
      query = query.eq("status", status);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (radionuclide) {
      query = query.ilike("radionuclide", `%${radionuclide}%`);
    }

    const { data: sources, error } = await query;

    if (error) {
      console.error("Error fetching sources:", error);
      return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
    }

    return NextResponse.json({ sources: sources || [] });
  } catch (error) {
    console.error("Sources GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new radioactive source
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "";
    const userName = user?.fullName || user?.firstName || "User";

    const supabase = createClient();

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const {
      radionuclide,
      source_form,
      description,
      serial_number,
      container_serial,
      license_item_number,
      initial_activity,
      activity_unit,
      calibration_date,
      half_life_days,
      category,
      room_type,
      location_building,
      location_floor,
      location_room,
      location_department,
      location_detail,
      status,
      acquired_date,
      acquired_from,
      notes,
    } = body as {
      radionuclide: string;
      source_form?: SourceForm;
      description?: string;
      serial_number?: string;
      container_serial?: string;
      license_item_number?: number;
      initial_activity: number;
      activity_unit?: string;
      calibration_date: string;
      half_life_days?: number;
      category?: SourceCategory;
      room_type?: string;
      location_building?: string;
      location_floor?: string;
      location_room?: string;
      location_department?: string;
      location_detail?: string;
      status?: SourceStatus;
      acquired_date?: string;
      acquired_from?: string;
      notes?: string;
    };

    if (!radionuclide || !initial_activity || !calibration_date) {
      return NextResponse.json(
        { error: "Radionuclide, initial activity, and calibration date are required" },
        { status: 400 }
      );
    }

    // Create the source
    const { data: source, error } = await supabase
      .from("radioactive_sources")
      .insert({
        organization_id: profile.organization_id,
        radionuclide: radionuclide.toUpperCase(),
        source_form: source_form || "sealed",
        description: description || null,
        serial_number: serial_number || null,
        container_serial: container_serial || null,
        license_item_number: license_item_number || null,
        initial_activity,
        activity_unit: activity_unit || "MBq",
        calibration_date,
        half_life_days: half_life_days || null,
        category: category || "nuclear_medicine",
        room_type: room_type || null,
        location_building: location_building || null,
        location_floor: location_floor || null,
        location_room: location_room || null,
        location_department: location_department || null,
        location_detail: location_detail || null,
        status: status || "active",
        acquired_date: acquired_date || null,
        acquired_from: acquired_from || null,
        notes: notes || null,
        metadata: {},
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating source:", error);
      return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: userName,
      user_email: userEmail,
      action: "source_add",
      resource_type: "radioactive_source",
      resource_id: source.id,
      details: { radionuclide, initial_activity, activity_unit: activity_unit || "MBq" },
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Sources POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
