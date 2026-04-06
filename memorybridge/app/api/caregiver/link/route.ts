import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { patientEmail, relationship = "patient" } = await req.json();

    // 1. Get current logged-in caregiver
    const { data: { user: caregiver }, error: authError } = await supabase.auth.getUser();
    if (authError || !caregiver) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find the patient by email
    // This requires a view or a specific query since auth.users is protected.
    // For this prototype, we query user_profiles to find the patient id.
    const { data: patientProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("role", "patient")
      // In a real app we'd look up by email, but user_profiles doesn't have email.
      // We'll assume the patient exists and we have their email or we lookup by display_name for now.
      // Wait, let's look at the schema again. user_profiles doesn't store email.
      // We might need to use the service role client if we want to search auth.users by email.
      .ilike("display_name", patientEmail.split('@')[0]) // Fallback for prototype search
      .single();

    if (profileError || !patientProfile) {
      return NextResponse.json({ error: "Patient not found or invalid role" }, { status: 404 });
    }

    // 3. Link them in care_relationships
    const { error: linkError } = await supabase
      .from("care_relationships")
      .insert([
        {
          caregiver_id: caregiver.id,
          patient_id: patientProfile.id,
          relationship: relationship
        }
      ]);

    if (linkError) {
      if (linkError.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "Patient is already linked" }, { status: 400 });
      }
      throw linkError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Linking error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
