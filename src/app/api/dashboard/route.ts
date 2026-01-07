import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const organizationId = profile?.organization_id;
    const organization = profile?.organizations;

    // Get equipment count
    const { count: equipmentCount } = await supabase
      .from("equipment")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("active", true);

    // Get today's date for QA queries
    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    // Get daily QA completion status
    const { data: dailyQAReports } = await supabase
      .from("qa_reports")
      .select("equipment_id")
      .eq("organization_id", organizationId)
      .eq("qa_type", "daily")
      .eq("date", today);

    const dailyQACompleted = dailyQAReports?.length || 0;

    // Get reports this month
    const { count: monthlyReportCount } = await supabase
      .from("qa_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("date", startOfMonth);

    // Get pending reviews (submitted but not approved)
    const { count: pendingReviews } = await supabase
      .from("qa_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "submitted");

    // Get recent activity
    const { data: recentReports } = await supabase
      .from("qa_reports")
      .select("*, equipment(name, equipment_type)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Check setup status
    const hasOrganizationName = organization?.name && !organization.name.includes("'s Organization");
    const hasEquipment = (equipmentCount || 0) > 0;

    return NextResponse.json({
      organization,
      stats: {
        equipmentCount: equipmentCount || 0,
        dailyQACompleted,
        dailyQATotal: equipmentCount || 0,
        pendingReviews: pendingReviews || 0,
        monthlyReportCount: monthlyReportCount || 0,
      },
      setupStatus: {
        hasOrganization: hasOrganizationName,
        hasEquipment,
        isComplete: hasOrganizationName && hasEquipment,
      },
      recentReports: recentReports || [],
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
