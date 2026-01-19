import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

// Equipment types that use radioactive sources
const SOURCE_EQUIPMENT_TYPES = [
  "brachytherapy_hdr",
  "brachytherapy_ldr",
  "gamma_camera",
  "spect",
  "spect_ct",
  "pet",
  "pet_ct",
  "pet_mri",
  "dose_calibrator",
  "cobalt60",
  "gamma_knife",
];

// Prevent static prerendering - requires Clerk auth at runtime
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const supabase = createClient();

  // Get user's profile and check for source-related equipment
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("clerk_id", userId)
    .single();

  let showSources = false;
  if (profile?.organization_id) {
    const { data: equipment } = await supabase
      .from("equipment")
      .select("equipment_type")
      .eq("organization_id", profile.organization_id)
      .eq("active", true)
      .in("equipment_type", SOURCE_EQUIPMENT_TYPES)
      .limit(1);

    showSources = (equipment && equipment.length > 0) || false;
  }

  // Create a profile-like object
  const sidebarProfile = {
    id: userId,
    email: user?.emailAddresses[0]?.emailAddress || "",
    full_name: profile?.full_name || user?.fullName || user?.firstName || "User",
    role: (profile?.role || "admin") as "admin" | "physicist" | "therapist",
    organization_id: profile?.organization_id || null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={sidebarProfile} showSources={showSources} />
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8 pt-4 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
