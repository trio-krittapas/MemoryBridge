import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PYTHON_SIDECAR_URL = process.env.PYTHON_SIDECAR_URL || 'http://localhost:8000';

// ── GET: fetch existing health data for the caregiver's linked patient ────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve the linked patient
    const { data: rel } = await supabase
      .from('care_relationships')
      .select('patient_id')
      .eq('caregiver_id', user.id)
      .single();

    if (!rel) return NextResponse.json({ data: null });

    const { data, error } = await supabase
      .from('patient_health_data')
      .select('*')
      .eq('patient_id', rel.patient_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    return NextResponse.json({ data: data ?? null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: save health data + call Python sidecar for ML prediction ─────────
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve linked patient
    const { data: rel } = await supabase
      .from('care_relationships')
      .select('patient_id')
      .eq('caregiver_id', user.id)
      .single();

    if (!rel) return NextResponse.json({ error: 'No linked patient found' }, { status: 404 });

    const patientId = rel.patient_id;

    // ── 1. Call Python sidecar for ML prediction ──────────────────────────
    // Map camelCase form fields → PascalCase expected by the Python model
    const sidecarPayload = {
      Age:                       body.age,
      Gender:                    body.gender,
      Ethnicity:                 body.ethnicity,
      EducationLevel:            body.educationLevel,
      BMI:                       body.bmi,
      Smoking:                   body.smoking,
      AlcoholConsumption:        body.alcoholConsumption,
      PhysicalActivity:          body.physicalActivity,
      DietQuality:               body.dietQuality,
      SleepQuality:              body.sleepQuality,
      FamilyHistoryAlzheimers:   body.familyHistoryAlzheimers,
      CardiovascularDisease:     body.cardiovascularDisease,
      Diabetes:                  body.diabetes,
      Depression:                body.depression,
      HeadInjury:                body.headInjury,
      Hypertension:              body.hypertension,
      SystolicBP:                body.systolicBP,
      DiastolicBP:               body.diastolicBP,
      CholesterolTotal:          body.cholesterolTotal,
      CholesterolLDL:            body.cholesterolLDL,
      CholesterolHDL:            body.cholesterolHDL,
      CholesterolTriglycerides:  body.cholesterolTriglycerides,
      MMSE:                      body.mmse,
      FunctionalAssessment:      body.functionalAssessment,
      MemoryComplaints:          body.memoryComplaints,
      BehavioralProblems:        body.behavioralProblems,
      ADL:                       body.adl,
      Confusion:                 body.confusion,
      Disorientation:            body.disorientation,
      PersonalityChanges:        body.personalityChanges,
      DifficultyCompletingTasks: body.difficultyCompletingTasks,
      Forgetfulness:             body.forgetfulness,
    };

    let prediction = { risk_score: null, risk_label: null, risk_description: null, top_risk_factors: null };

    try {
      const sidecarRes = await fetch(`${PYTHON_SIDECAR_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sidecarPayload),
      });

      if (sidecarRes.ok) {
        prediction = await sidecarRes.json();
      } else {
        console.warn('Prediction sidecar returned error:', await sidecarRes.text());
      }
    } catch (sidecarErr) {
      // Don't block save if sidecar is down — just store without prediction
      console.warn('Prediction sidecar unreachable:', sidecarErr);
    }

    // ── 2. Upsert into Supabase (one record per patient) ──────────────────
    const { data, error } = await supabase
      .from('patient_health_data')
      .upsert(
        {
          patient_id:                  patientId,
          age:                         body.age,
          gender:                      body.gender,
          ethnicity:                   body.ethnicity,
          education_level:             body.educationLevel,
          bmi:                         body.bmi,
          smoking:                     body.smoking,
          alcohol_consumption:         body.alcoholConsumption,
          physical_activity:           body.physicalActivity,
          diet_quality:                body.dietQuality,
          sleep_quality:               body.sleepQuality,
          family_history_alzheimers:   body.familyHistoryAlzheimers,
          cardiovascular_disease:      body.cardiovascularDisease,
          diabetes:                    body.diabetes,
          depression:                  body.depression,
          head_injury:                 body.headInjury,
          hypertension:                body.hypertension,
          systolic_bp:                 body.systolicBP,
          diastolic_bp:                body.diastolicBP,
          cholesterol_total:           body.cholesterolTotal,
          cholesterol_ldl:             body.cholesterolLDL,
          cholesterol_hdl:             body.cholesterolHDL,
          cholesterol_triglycerides:   body.cholesterolTriglycerides,
          mmse:                        body.mmse,
          functional_assessment:       body.functionalAssessment,
          adl:                         body.adl,
          memory_complaints:           body.memoryComplaints,
          behavioral_problems:         body.behavioralProblems,
          confusion:                   body.confusion,
          disorientation:              body.disorientation,
          personality_changes:         body.personalityChanges,
          difficulty_completing_tasks: body.difficultyCompletingTasks,
          forgetfulness:               body.forgetfulness,
          risk_score:                  prediction.risk_score,
          risk_label:                  prediction.risk_label,
          risk_description:            prediction.risk_description,
          top_risk_factors:            prediction.top_risk_factors,
          updated_at:                  new Date().toISOString(),
        },
        { onConflict: 'patient_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, prediction });
  } catch (error: any) {
    console.error('Health data API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
