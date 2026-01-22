import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE - Delete a QA report
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
    const userName = user?.fullName || user?.firstName || "User";

    const supabase = createClient();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, organization_id, role")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Only admins and physicists can delete reports
    if (!["admin", "physicist"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify report belongs to organization
    const { data: report } = await supabase
      .from("qa_reports")
      .select("id, equipment_id, qa_type, date")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Delete associated test results first (foreign key constraint)
    await supabase
      .from("qa_tests")
      .delete()
      .eq("report_id", id);

    // Delete the report
    const { error: deleteError } = await supabase
      .from("qa_reports")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (deleteError) {
      console.error("Error deleting report:", deleteError);
      return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: profile.full_name || userName,
      action: "qa_delete",
      resource_type: "qa_report",
      resource_id: id,
      details: {
        qa_type: report.qa_type,
        date: report.date,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QA report DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get a single QA report with details
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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Get report with test results
    const { data: report, error } = await supabase
      .from("qa_reports")
      .select(`
        *,
        equipment:equipment_id (id, name, equipment_type),
        tests:qa_tests (*)
      `)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("QA report GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
