import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { EquipmentType } from "@/types/database";

// GET - List all equipment for the user's organization
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ equipment: [] });
    }

    // Get equipment for the organization
    const { data: equipment, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Error fetching equipment:", error);
      return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
    }

    return NextResponse.json({ equipment: equipment || [] });
  } catch (error) {
    console.error("Equipment GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new equipment
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

    // Get or create profile and organization
    let { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    // If no profile exists, create one with a new organization
    if (!profile) {
      // Create a new organization for this user
      const orgSlug = userEmail.split("@")[0] + "-" + Date.now().toString(36);
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: `${userName}'s Organization`,
          slug: orgSlug,
          subscription_tier: "free",
          subscription_status: "trial",
          max_equipment: 5,
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
      }

      // Create the profile
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          clerk_id: userId,
          organization_id: newOrg.id,
          email: userEmail,
          full_name: userName,
          role: "admin",
          is_active: true,
        })
        .select("*, organizations(*)")
        .single();

      if (profileError) {
        console.error("Error creating profile:", profileError);
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
      }

      profile = newProfile;
    }

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
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
    } = body as {
      name: string;
      equipment_type: EquipmentType;
      manufacturer?: string;
      model?: string;
      serial_number?: string;
      location?: string;
      room_number?: string;
      photon_energies?: string[];
      electron_energies?: string[];
    };

    if (!name || !equipment_type) {
      return NextResponse.json({ error: "Name and equipment type are required" }, { status: 400 });
    }

    // Check equipment limit
    const { count } = await supabase
      .from("equipment")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("active", true);

    const maxEquipment = profile.organizations?.max_equipment || 5;
    if (count !== null && count >= maxEquipment) {
      return NextResponse.json(
        { error: `Equipment limit reached (${maxEquipment}). Upgrade your plan to add more.` },
        { status: 400 }
      );
    }

    // Create the equipment
    const { data: equipment, error } = await supabase
      .from("equipment")
      .insert({
        organization_id: profile.organization_id,
        name,
        equipment_type,
        manufacturer: manufacturer || null,
        model: model || null,
        serial_number: serial_number || null,
        location: location || null,
        room_number: room_number || null,
        photon_energies: photon_energies || [],
        electron_energies: electron_energies || [],
        fff_energies: [],
        active: true,
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating equipment:", error);
      return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: userName,
      user_email: userEmail,
      action: "equipment_add",
      resource_type: "equipment",
      resource_id: equipment.id,
      details: { name, equipment_type },
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error("Equipment POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
