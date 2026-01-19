import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - List all radionuclide reference data
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const { data: radionuclides, error } = await supabase
      .from("radionuclide_data")
      .select("*")
      .order("radionuclide");

    if (error) {
      console.error("Error fetching radionuclides:", error);
      return NextResponse.json({ error: "Failed to fetch radionuclides" }, { status: 500 });
    }

    return NextResponse.json({ radionuclides: radionuclides || [] });
  } catch (error) {
    console.error("Radionuclides GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
