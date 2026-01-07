import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Create a new QA report
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userName = user?.fullName || user?.firstName || "User";

    const supabase = createClient();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, organization_id")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const {
      equipment_id,
      qa_type,
      comments,
      results,
    } = body as {
      equipment_id: string;
      qa_type: string;
      comments?: string;
      results: Array<{
        test_id: string;
        status: string;
        measurement?: number;
        notes?: string;
      }>;
    };

    if (!equipment_id || !qa_type) {
      return NextResponse.json({ error: "Equipment ID and QA type are required" }, { status: 400 });
    }

    // Verify equipment belongs to organization
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name")
      .eq("id", equipment_id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Calculate overall result
    const hasFailure = results.some((r) => r.status === "fail");
    const allPassed = results.every((r) => r.status === "pass" || r.status === "na" || !r.status);
    const overallResult = hasFailure ? "fail" : allPassed ? "pass" : "conditional";

    // Create the QA report
    const { data: report, error: reportError } = await supabase
      .from("qa_reports")
      .insert({
        organization_id: profile.organization_id,
        equipment_id: equipment_id,
        qa_type: qa_type,
        date: new Date().toISOString().split("T")[0],
        performer_id: profile.id,
        performer_name: profile.full_name || userName,
        status: "submitted",
        overall_result: overallResult,
        comments: comments || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error creating report:", reportError);
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    // Insert test results
    const testInserts = results
      .filter((r) => r.status)
      .map((r) => ({
        report_id: report.id,
        test_id: r.test_id,
        status: r.status,
        measurement: r.measurement || null,
        notes: r.notes || null,
      }));

    if (testInserts.length > 0) {
      const { error: testsError } = await supabase.from("qa_tests").insert(testInserts);

      if (testsError) {
        console.error("Error creating test results:", testsError);
        // Don't fail the whole request, report was created
      }
    }

    // Log the action
    await supabase.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      user_name: profile.full_name || userName,
      action: "qa_submit",
      resource_type: "qa_report",
      resource_id: report.id,
      details: {
        equipment_name: equipment.name,
        qa_type,
        overall_result: overallResult,
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("QA report POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
