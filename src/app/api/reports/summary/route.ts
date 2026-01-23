import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Generate QA summary report
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
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const equipmentId = searchParams.get("equipment");

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: "Date range is required" }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from("qa_reports")
      .select(`
        id,
        equipment_id,
        qa_type,
        date,
        performer_name,
        overall_result,
        status,
        equipment:equipment_id (
          id,
          name,
          equipment_type
        )
      `)
      .eq("organization_id", profile.organization_id)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: false });

    if (equipmentId) {
      query = query.eq("equipment_id", equipmentId);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      total: reports?.length || 0,
      passed: reports?.filter((r) => r.overall_result === "pass").length || 0,
      failed: reports?.filter((r) => r.overall_result === "fail").length || 0,
      conditional: reports?.filter((r) => r.overall_result === "conditional").length || 0,
    };

    return NextResponse.json({ reports: reports || [], stats });
  } catch (error) {
    console.error("Summary report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
