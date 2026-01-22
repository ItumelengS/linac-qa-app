import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Get QA report history for the organization
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Get reports with equipment info
    const { data: reports, error } = await supabase
      .from("qa_reports")
      .select(`
        id,
        equipment_id,
        qa_type,
        date,
        performer_name,
        overall_result,
        status,
        comments,
        created_at,
        equipment:equipment_id (
          id,
          name,
          equipment_type
        )
      `)
      .eq("organization_id", profile.organization_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("QA history GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
