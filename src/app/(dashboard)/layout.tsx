import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

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

  // Create a profile-like object from Clerk user data
  const profile = {
    id: userId,
    email: user?.emailAddresses[0]?.emailAddress || "",
    full_name: user?.fullName || user?.firstName || "User",
    role: "admin" as const, // Default role, will be synced from database
    organization_id: null as string | null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
