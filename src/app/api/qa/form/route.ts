import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get QA form data (equipment, tests, profile)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "";
    const userName = user?.fullName || user?.firstName || "User";

    const searchParams = request.nextUrl.searchParams;
    const equipmentId = searchParams.get("equipment");
    const equipmentType = searchParams.get("equipmentType");
    const frequency = searchParams.get("frequency");

    if (!equipmentType || !frequency) {
      return NextResponse.json({ error: "Equipment type and frequency are required" }, { status: 400 });
    }

    const supabase = createClient();

    // Get or create profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    if (!profile) {
      // Create organization and profile
      const orgSlug = userEmail.split("@")[0] + "-" + Date.now().toString(36);
      const { data: newOrg } = await supabase
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

      if (newOrg) {
        const { data: newProfile } = await supabase
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

        profile = newProfile;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
    }

    // Get equipment if ID provided
    let equipment = null;
    if (equipmentId) {
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", equipmentId)
        .eq("organization_id", profile.organization_id)
        .single();

      equipment = equipmentData;
    }

    // Get test definitions
    const { data: tests } = await supabase
      .from("qa_test_definitions")
      .select("*")
      .eq("equipment_type", equipmentType)
      .eq("frequency", frequency)
      .eq("is_active", true)
      .order("display_order");

    return NextResponse.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        organization_id: profile.organization_id,
      },
      equipment,
      tests: tests || [],
    });
  } catch (error) {
    console.error("QA form GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
