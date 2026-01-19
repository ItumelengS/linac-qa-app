import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { EquipmentType } from "@/types/database";

// PUT - Update equipment
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

    // Verify the equipment belongs to the user's organization
    const { data: existingEquipment } = await supabase
      .from("equipment")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!existingEquipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      equipment_type,
      manufacturer,
      model,
      serial_number,
      location,
      room_number,
      photon_energies,
      electron_energies,
      detector_heads,
      source_position_checks,
    } = body as {
      name?: string;
      equipment_type?: EquipmentType;
      manufacturer?: string;
      model?: string;
      serial_number?: string;
      location?: string;
      room_number?: string;
      photon_energies?: string[];
      electron_energies?: string[];
      detector_heads?: number | null;
      source_position_checks?: number | null;
    };

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (equipment_type !== undefined) updateData.equipment_type = equipment_type;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer || null;
    if (model !== undefined) updateData.model = model || null;
    if (serial_number !== undefined) updateData.serial_number = serial_number || null;
    if (location !== undefined) updateData.location = location || null;
    if (room_number !== undefined) updateData.room_number = room_number || null;
    if (photon_energies !== undefined) updateData.photon_energies = photon_energies || [];
    if (electron_energies !== undefined) updateData.electron_energies = electron_energies || [];
    if (detector_heads !== undefined) updateData.detector_heads = detector_heads;
    if (source_position_checks !== undefined) updateData.source_position_checks = source_position_checks;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Update the equipment
    const { data: equipment, error } = await supabase
      .from("equipment")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating equipment:", error);
      return NextResponse.json({ error: "Failed to update equipment" }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: userName,
      user_email: userEmail,
      action: "equipment_update",
      resource_type: "equipment",
      resource_id: equipment.id,
      details: { updated_fields: Object.keys(updateData), name: equipment.name },
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("Equipment PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
