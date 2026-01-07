import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get the user's organization
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "";
    const userName = user?.fullName || user?.firstName || "User";

    const supabase = createClient();

    // Get user's profile and organization
    let { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    // If no profile exists, create one with a new organization
    if (!profile) {
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

    return NextResponse.json({ organization: profile?.organizations || null });
  } catch (error) {
    console.error("Organization GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update the user's organization
export async function PUT(request: NextRequest) {
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
    let { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("clerk_id", userId)
      .single();

    // If no profile, create one first
    if (!profile) {
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

    // Check if user is admin
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can update organization settings" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, address, phone, email } = body as {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
    };

    // Update the organization
    const { data: organization, error } = await supabase
      .from("organizations")
      .update({
        name: name || profile.organizations?.name,
        address: address || null,
        phone: phone || null,
        email: email || null,
      })
      .eq("id", profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: userName,
      user_email: userEmail,
      action: "settings_change",
      resource_type: "organization",
      resource_id: profile.organization_id,
      details: { updated_fields: Object.keys(body) },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Organization PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
