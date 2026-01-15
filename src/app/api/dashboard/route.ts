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

    // Get brachytherapy equipment with source data
    const { data: brachyEquipment } = await supabase
      .from("equipment")
      .select("id, name, equipment_type")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .in("equipment_type", ["brachytherapy_hdr", "brachytherapy_ldr"]);

    // Get source baselines for brachytherapy equipment
    const brachySources: Array<{
      equipment_id: string;
      equipment_name: string;
      equipment_type: string;
      source_serial?: string;
      initial_activity?: number;
      calibration_date?: string;
      unit?: string;
      current_activity?: number;
      days_elapsed?: number;
    }> = [];

    if (brachyEquipment && brachyEquipment.length > 0) {
      for (const equip of brachyEquipment) {
        // Get source baseline (DBR6 stores source decay data)
        const { data: baseline } = await supabase
          .from("equipment_baselines")
          .select("values, source_serial")
          .eq("equipment_id", equip.id)
          .eq("test_id", "DBR6")
          .eq("is_current", true)
          .single();

        if (baseline?.values) {
          const vals = baseline.values as {
            initial_activity?: number;
            calibration_date?: string;
            unit?: string;
          };

          if (vals.initial_activity && vals.calibration_date) {
            // Calculate current activity using Ir-192 decay
            const halfLife = 73.83; // days
            const decayConstant = Math.LN2 / halfLife;
            const calDate = new Date(vals.calibration_date);
            const today = new Date();
            const daysElapsed = (today.getTime() - calDate.getTime()) / (1000 * 60 * 60 * 24);
            const currentActivity = vals.initial_activity * Math.exp(-decayConstant * daysElapsed);

            brachySources.push({
              equipment_id: equip.id,
              equipment_name: equip.name,
              equipment_type: equip.equipment_type,
              source_serial: baseline.source_serial || undefined,
              initial_activity: vals.initial_activity,
              calibration_date: vals.calibration_date,
              unit: vals.unit || "Ci",
              current_activity: currentActivity,
              days_elapsed: Math.round(daysElapsed),
            });
          }
        }
      }
    }

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
      brachySources,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
