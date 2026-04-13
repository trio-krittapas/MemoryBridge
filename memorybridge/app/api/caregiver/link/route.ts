import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { patientEmail, relationship = "patient" } = await req.json();

    if (!patientEmail?.trim()) {
      return NextResponse.json({ error: "Patient email is required" }, { status: 400 });
    }

    // 1. Get current logged-in caregiver
    const { data: { user: caregiver }, error: authError } = await supabase.auth.getUser();
    if (authError || !caregiver) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find the patient by email using admin client (can query auth.users)
    const { data: authUsers, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = authUsers.users.find(
      (u) => u.email?.toLowerCase() === patientEmail.trim().toLowerCase()
    );

    if (!targetUser) {
      return NextResponse.json({ error: "No account found with that email address." }, { status: 404 });
    }

    // 3. Confirm they have a patient profile
    const { data: patientProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, role, display_name")
      .eq("id", targetUser.id)
      .single();

    if (profileError || !patientProfile) {
      return NextResponse.json({ error: "That user has no MemoryBridge profile yet." }, { status: 404 });
    }

    if (patientProfile.role !== "patient") {
      return NextResponse.json({ error: "That account is not a patient account." }, { status: 400 });
    }

    // 4. Prevent linking yourself
    if (targetUser.id === caregiver.id) {
      return NextResponse.json({ error: "You cannot link yourself as a patient." }, { status: 400 });
    }

    // 5. Insert care_relationship
    const { error: linkError } = await supabase
      .from("care_relationships")
      .insert([{ caregiver_id: caregiver.id, patient_id: patientProfile.id, relationship }]);

    if (linkError) {
      if (linkError.code === "23505") {
        return NextResponse.json({ error: "This patient is already linked to your account." }, { status: 400 });
      }
      throw linkError;
    }

    return NextResponse.json({ success: true, patient: patientProfile.display_name });
  } catch (err: any) {
    console.error("Linking error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
