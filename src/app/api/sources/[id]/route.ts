import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SourceStatus, SourceCategory, SourceForm } from "@/types/database";

// GET - Get a single source with history
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
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Get source with calculated activity
    const { data: source, error } = await supabase
      .from("sources_with_activity")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (error || !source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Get status history
    const { data: history } = await supabase
      .from("source_status_history")
      .select("*")
      .eq("source_id", id)
      .order("changed_at", { ascending: false });

    return NextResponse.json({ source, history: history || [] });
  } catch (error) {
    console.error("Source GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update a source
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

    // Verify source belongs to organization
    const { data: existingSource } = await supabase
      .from("radioactive_sources")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!existingSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
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
      status_notes,
      acquired_date,
      acquired_from,
      disposed_date,
      disposed_method,
      disposal_certificate,
      transferred_to,
      transfer_date,
      transfer_authorization,
      notes,
    } = body as {
      radionuclide?: string;
      source_form?: SourceForm;
      description?: string;
      serial_number?: string;
      container_serial?: string;
      license_item_number?: number;
      initial_activity?: number;
      activity_unit?: string;
      calibration_date?: string;
      half_life_days?: number;
      category?: SourceCategory;
      room_type?: string;
      location_building?: string;
      location_floor?: string;
      location_room?: string;
      location_department?: string;
      location_detail?: string;
      status?: SourceStatus;
      status_notes?: string;
      acquired_date?: string;
      acquired_from?: string;
      disposed_date?: string;
      disposed_method?: string;
      disposal_certificate?: string;
      transferred_to?: string;
      transfer_date?: string;
      transfer_authorization?: string;
      notes?: string;
    };

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (radionuclide !== undefined) updateData.radionuclide = radionuclide.toUpperCase();
    if (source_form !== undefined) updateData.source_form = source_form;
    if (description !== undefined) updateData.description = description || null;
    if (serial_number !== undefined) updateData.serial_number = serial_number || null;
    if (container_serial !== undefined) updateData.container_serial = container_serial || null;
    if (license_item_number !== undefined) updateData.license_item_number = license_item_number;
    if (initial_activity !== undefined) updateData.initial_activity = initial_activity;
    if (activity_unit !== undefined) updateData.activity_unit = activity_unit;
    if (calibration_date !== undefined) updateData.calibration_date = calibration_date;
    if (half_life_days !== undefined) updateData.half_life_days = half_life_days;
    if (category !== undefined) updateData.category = category;
    if (room_type !== undefined) updateData.room_type = room_type || null;
    if (location_building !== undefined) updateData.location_building = location_building || null;
    if (location_floor !== undefined) updateData.location_floor = location_floor || null;
    if (location_room !== undefined) updateData.location_room = location_room || null;
    if (location_department !== undefined) updateData.location_department = location_department || null;
    if (location_detail !== undefined) updateData.location_detail = location_detail || null;
    if (status !== undefined) {
      updateData.status = status;
      updateData.status_changed_by = profile.id;
    }
    if (status_notes !== undefined) updateData.status_notes = status_notes || null;
    if (acquired_date !== undefined) updateData.acquired_date = acquired_date || null;
    if (acquired_from !== undefined) updateData.acquired_from = acquired_from || null;
    if (disposed_date !== undefined) updateData.disposed_date = disposed_date || null;
    if (disposed_method !== undefined) updateData.disposed_method = disposed_method || null;
    if (disposal_certificate !== undefined) updateData.disposal_certificate = disposal_certificate || null;
    if (transferred_to !== undefined) updateData.transferred_to = transferred_to || null;
    if (transfer_date !== undefined) updateData.transfer_date = transfer_date || null;
    if (transfer_authorization !== undefined) updateData.transfer_authorization = transfer_authorization || null;
    if (notes !== undefined) updateData.notes = notes || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Update the source
    const { data: source, error } = await supabase
      .from("radioactive_sources")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating source:", error);
      return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
    }

    // Log the action
    const action = status !== undefined && status !== existingSource.status
      ? `source_status_${status}`
      : "source_update";

    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: userName,
      user_email: userEmail,
      action,
      resource_type: "radioactive_source",
      resource_id: source.id,
      details: {
        updated_fields: Object.keys(updateData),
        radionuclide: source.radionuclide,
        old_status: existingSource.status,
        new_status: status,
      },
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Source PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove a source (soft delete by marking as discarded, or hard delete)
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

    // Verify source belongs to organization
    const { data: existingSource } = await supabase
      .from("radioactive_sources")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!existingSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Hard delete the source
    const { error } = await supabase
      .from("radioactive_sources")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (error) {
      console.error("Error deleting source:", error);
      return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: userName,
      user_email: userEmail,
      action: "source_delete",
      resource_type: "radioactive_source",
      resource_id: id,
      details: {
        radionuclide: existingSource.radionuclide,
        serial_number: existingSource.serial_number,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Source DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
