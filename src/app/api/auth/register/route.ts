import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName, organizationName } = await request.json();

    // Validate input
    if (!email || !password || !fullName || !organizationName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Create organization slug
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // 1. Create the organization first (using admin client)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: organizationName,
        slug: slug,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Org creation error:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization: " + orgError.message },
        { status: 500 }
      );
    }

    // 2. Create the user with the organization ID in metadata
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        organization_id: orgData.id,
        role: "admin",
      },
    });

    if (signUpError) {
      // Rollback: delete the organization
      await supabaseAdmin.from("organizations").delete().eq("id", orgData.id);

      console.error("User creation error:", signUpError);
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    // 3. Create/update the profile with organization
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        organization_id: orgData.id,
        role: "admin",
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      // Not critical, profile trigger might handle this
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
