'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Save, Brain, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
interface HealthForm {
  // Demographics
  age: number;
  gender: number;
  ethnicity: number;
  educationLevel: number;
  // Lifestyle
  bmi: number;
  smoking: number;
  alcoholConsumption: number;
  physicalActivity: number;
  dietQuality: number;
  sleepQuality: number;
  // Medical History
  familyHistoryAlzheimers: number;
  cardiovascularDisease: number;
  diabetes: number;
  depression: number;
  headInjury: number;
  hypertension: number;
  // Clinical Measurements
  systolicBP: number;
  diastolicBP: number;
  cholesterolTotal: number;
  cholesterolLDL: number;
  cholesterolHDL: number;
  cholesterolTriglycerides: number;
  // Cognitive Assessments
  mmse: number;
  functionalAssessment: number;
  adl: number;
  // Observed Symptoms
  memoryComplaints: number;
  behavioralProblems: number;
  confusion: number;
  disorientation: number;
  personalityChanges: number;
  difficultyCompletingTasks: number;
  forgetfulness: number;
}

interface Prediction {
  risk_score: number;
  risk_label: 'LOW' | 'MODERATE' | 'HIGH';
  risk_description: string;
  top_risk_factors: unknown;
}

function normalizeTopRiskFactors(value: unknown): string[] {
  const normalizeArray = (items: unknown[]) =>
    items
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

  if (Array.isArray(value)) {
    return normalizeArray(value);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return normalizeArray(parsed);
      }
    } catch {
      return [];
    }
  }

  return [];
}

const DEFAULTS: HealthForm = {
  age: 70, gender: 0, ethnicity: 0, educationLevel: 1,
  bmi: 25, smoking: 0, alcoholConsumption: 0, physicalActivity: 3, dietQuality: 7, sleepQuality: 7,
  familyHistoryAlzheimers: 0, cardiovascularDisease: 0, diabetes: 0, depression: 0, headInjury: 0, hypertension: 0,
  systolicBP: 120, diastolicBP: 80, cholesterolTotal: 200, cholesterolLDL: 130, cholesterolHDL: 50, cholesterolTriglycerides: 150,
  mmse: 26, functionalAssessment: 8, adl: 8,
  memoryComplaints: 0, behavioralProblems: 0, confusion: 0, disorientation: 0,
  personalityChanges: 0, difficultyCompletingTasks: 0, forgetfulness: 0,
};

// ── Risk Result Card ──────────────────────────────────────────────────────
function RiskResultCard({ prediction }: { prediction: Prediction }) {
  const factors = normalizeTopRiskFactors(prediction.top_risk_factors);
  const config = {
    LOW:      { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, bar: 'bg-emerald-500' },
    MODERATE: { color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     icon: AlertTriangle, bar: 'bg-amber-500' },
    HIGH:     { color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         icon: AlertTriangle, bar: 'bg-red-500' },
  }[prediction.risk_label];

  const Icon = config.icon;

  return (
    <Card className={`border-2 ${config.bg} animate-in zoom-in-95 duration-500`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className={`mt-1 ${config.color}`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-black ${config.color}`}>{prediction.risk_score}</span>
              <span className="text-zinc-500 text-lg">/100</span>
              <span className={`ml-auto text-lg font-bold px-3 py-1 rounded-full ${config.bg} ${config.color} border`}>
                {prediction.risk_label} RISK
              </span>
            </div>

            {/* Score bar */}
            <div className="mt-3 h-3 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${config.bar}`}
                style={{ width: `${prediction.risk_score}%` }}
              />
            </div>

            <p className="mt-3 text-zinc-700 text-sm leading-relaxed">{prediction.risk_description}</p>
          </div>
        </div>

        {factors.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Top Contributing Factors</p>
            <div className="flex flex-wrap gap-2">
              {factors.map(f => (
                <span key={f} className="text-xs px-2 py-1 bg-white border rounded-full text-zinc-700 font-medium">
                  {f.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Toggle Button (Yes/No) ────────────────────────────────────────────────
function YesNoToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-200 w-fit">
      <button
        type="button"
        onClick={() => onChange(0)}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${value === 0 ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
      >
        No
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${value === 1 ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
      >
        Yes
      </button>
    </div>
  );
}

// ── Select helper ─────────────────────────────────────────────────────────
function SelectField({ value, onChange, options }: {
  value: number;
  onChange: (v: number) => void;
  options: { label: string; value: number }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Number Input helper ────────────────────────────────────────────────────
function NumField({ value, onChange, min, max, step = 1, unit }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-28"
      />
      {unit && <span className="text-sm text-zinc-500">{unit}</span>}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-zinc-700">{label}</Label>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function HealthProfilePage() {
  const [form, setForm] = useState<HealthForm>(DEFAULTS);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLinkedPatient, setHasLinkedPatient] = useState(true);

  const set = (key: keyof HealthForm) => (val: number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // Load existing data
  useEffect(() => {
    fetch('/api/patient/health')
      .then(r => r.json())
      .then(({ data, error }) => {
        // If the API explicitly returns null data with no error, no patient is linked
        if (data === null && !error) {
          setHasLinkedPatient(false);
          return;
        }
        if (data) {
          setHasLinkedPatient(true);
          // Map snake_case DB columns back to camelCase form keys
          setForm({
            age: data.age ?? DEFAULTS.age,
            gender: data.gender ?? DEFAULTS.gender,
            ethnicity: data.ethnicity ?? DEFAULTS.ethnicity,
            educationLevel: data.education_level ?? DEFAULTS.educationLevel,
            bmi: data.bmi ?? DEFAULTS.bmi,
            smoking: data.smoking ?? DEFAULTS.smoking,
            alcoholConsumption: data.alcohol_consumption ?? DEFAULTS.alcoholConsumption,
            physicalActivity: data.physical_activity ?? DEFAULTS.physicalActivity,
            dietQuality: data.diet_quality ?? DEFAULTS.dietQuality,
            sleepQuality: data.sleep_quality ?? DEFAULTS.sleepQuality,
            familyHistoryAlzheimers: data.family_history_alzheimers ?? DEFAULTS.familyHistoryAlzheimers,
            cardiovascularDisease: data.cardiovascular_disease ?? DEFAULTS.cardiovascularDisease,
            diabetes: data.diabetes ?? DEFAULTS.diabetes,
            depression: data.depression ?? DEFAULTS.depression,
            headInjury: data.head_injury ?? DEFAULTS.headInjury,
            hypertension: data.hypertension ?? DEFAULTS.hypertension,
            systolicBP: data.systolic_bp ?? DEFAULTS.systolicBP,
            diastolicBP: data.diastolic_bp ?? DEFAULTS.diastolicBP,
            cholesterolTotal: data.cholesterol_total ?? DEFAULTS.cholesterolTotal,
            cholesterolLDL: data.cholesterol_ldl ?? DEFAULTS.cholesterolLDL,
            cholesterolHDL: data.cholesterol_hdl ?? DEFAULTS.cholesterolHDL,
            cholesterolTriglycerides: data.cholesterol_triglycerides ?? DEFAULTS.cholesterolTriglycerides,
            mmse: data.mmse ?? DEFAULTS.mmse,
            functionalAssessment: data.functional_assessment ?? DEFAULTS.functionalAssessment,
            adl: data.adl ?? DEFAULTS.adl,
            memoryComplaints: data.memory_complaints ?? DEFAULTS.memoryComplaints,
            behavioralProblems: data.behavioral_problems ?? DEFAULTS.behavioralProblems,
            confusion: data.confusion ?? DEFAULTS.confusion,
            disorientation: data.disorientation ?? DEFAULTS.disorientation,
            personalityChanges: data.personality_changes ?? DEFAULTS.personalityChanges,
            difficultyCompletingTasks: data.difficulty_completing_tasks ?? DEFAULTS.difficultyCompletingTasks,
            forgetfulness: data.forgetfulness ?? DEFAULTS.forgetfulness,
          });
          if (data.risk_score != null) {
            setPrediction({
              risk_score: data.risk_score,
              risk_label: data.risk_label,
              risk_description: data.risk_description,
              top_risk_factors: normalizeTopRiskFactors(data.top_risk_factors),
            });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/patient/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.status === 404) {
        toast.error('No patient linked to your account. Please link a patient in Settings first.');
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      if (json.prediction?.risk_score != null) {
        setPrediction({
          ...json.prediction,
          top_risk_factors: normalizeTopRiskFactors(json.prediction.top_risk_factors),
        });
        toast.success('Health profile saved and risk assessed.');
      } else {
        toast.success('Health profile saved. Risk assessment is currently unavailable — please try again later.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!hasLinkedPatient) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="bg-zinc-100 p-8 rounded-full mb-4">
          <Brain className="h-16 w-16 text-zinc-300" />
        </div>
        <h2 className="text-2xl font-bold">No Patient Linked</h2>
        <p className="text-zinc-500 max-w-sm">
          Please link a patient account in Settings before filling in the health profile.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight">Patient Health Profile</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Fill in your loved one&apos;s health information to help monitor their cognitive wellbeing. This information is used to generate a personalised health risk assessment.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save & Assess
        </Button>
      </div>

      {/* Risk Result */}
      {prediction && <RiskResultCard prediction={prediction} />}

      {/* ── Demographics ── */}
      <Section title="Demographics" description="Basic personal information about the patient.">
        <Field label="Age">
          <NumField value={form.age} onChange={set('age')} min={40} max={110} unit="years" />
        </Field>
        <Field label="Gender">
          <SelectField value={form.gender} onChange={set('gender')} options={[{ label: 'Male', value: 0 }, { label: 'Female', value: 1 }]} />
        </Field>
        <Field label="Ethnicity">
          <SelectField value={form.ethnicity} onChange={set('ethnicity')} options={[
            { label: 'Caucasian', value: 0 }, { label: 'African American', value: 1 },
            { label: 'Asian', value: 2 }, { label: 'Other', value: 3 },
          ]} />
        </Field>
        <Field label="Education Level">
          <SelectField value={form.educationLevel} onChange={set('educationLevel')} options={[
            { label: 'No Formal Education', value: 0 }, { label: 'High School', value: 1 },
            { label: "Bachelor's Degree", value: 2 }, { label: 'Higher Education', value: 3 },
          ]} />
        </Field>
      </Section>

      {/* ── Lifestyle ── */}
      <Section title="Lifestyle" description="Daily habits and activity levels.">
        <Field label="BMI">
          <NumField value={form.bmi} onChange={set('bmi')} min={10} max={60} step={0.1} unit="kg/m²" />
        </Field>
        <Field label="Smoking">
          <YesNoToggle value={form.smoking} onChange={set('smoking')} />
        </Field>
        <Field label="Alcohol Consumption">
          <NumField value={form.alcoholConsumption} onChange={set('alcoholConsumption')} min={0} max={20} step={0.5} unit="units/week" />
        </Field>
        <Field label="Physical Activity">
          <NumField value={form.physicalActivity} onChange={set('physicalActivity')} min={0} max={10} step={0.5} unit="hrs/week" />
        </Field>
        <Field label="Diet Quality (0–10)">
          <NumField value={form.dietQuality} onChange={set('dietQuality')} min={0} max={10} step={1} />
        </Field>
        <Field label="Sleep Quality (4–10)">
          <NumField value={form.sleepQuality} onChange={set('sleepQuality')} min={4} max={10} step={0.5} />
        </Field>
      </Section>

      {/* ── Medical History ── */}
      <Section title="Medical History" description="Known diagnoses and risk factors.">
        <Field label="Family History of Alzheimer's">
          <YesNoToggle value={form.familyHistoryAlzheimers} onChange={set('familyHistoryAlzheimers')} />
        </Field>
        <Field label="Cardiovascular Disease">
          <YesNoToggle value={form.cardiovascularDisease} onChange={set('cardiovascularDisease')} />
        </Field>
        <Field label="Diabetes">
          <YesNoToggle value={form.diabetes} onChange={set('diabetes')} />
        </Field>
        <Field label="Depression">
          <YesNoToggle value={form.depression} onChange={set('depression')} />
        </Field>
        <Field label="Head Injury (past)">
          <YesNoToggle value={form.headInjury} onChange={set('headInjury')} />
        </Field>
        <Field label="Hypertension">
          <YesNoToggle value={form.hypertension} onChange={set('hypertension')} />
        </Field>
      </Section>

      {/* ── Clinical Measurements ── */}
      <Section title="Clinical Measurements" description="Values from the patient's most recent medical report.">
        <Field label="Systolic Blood Pressure">
          <NumField value={form.systolicBP} onChange={set('systolicBP')} min={80} max={220} unit="mmHg" />
        </Field>
        <Field label="Diastolic Blood Pressure">
          <NumField value={form.diastolicBP} onChange={set('diastolicBP')} min={40} max={140} unit="mmHg" />
        </Field>
        <Field label="Total Cholesterol">
          <NumField value={form.cholesterolTotal} onChange={set('cholesterolTotal')} min={100} max={400} unit="mg/dL" />
        </Field>
        <Field label="LDL Cholesterol">
          <NumField value={form.cholesterolLDL} onChange={set('cholesterolLDL')} min={50} max={300} unit="mg/dL" />
        </Field>
        <Field label="HDL Cholesterol">
          <NumField value={form.cholesterolHDL} onChange={set('cholesterolHDL')} min={20} max={120} unit="mg/dL" />
        </Field>
        <Field label="Triglycerides">
          <NumField value={form.cholesterolTriglycerides} onChange={set('cholesterolTriglycerides')} min={50} max={600} unit="mg/dL" />
        </Field>
      </Section>

      {/* ── Cognitive Assessments ── */}
      <Section title="Cognitive Assessment Scores" description="Scores from your loved one&apos;s recent check-up (ask their doctor if unsure).">
        <Field label="Memory & Thinking Score (0–30)">
          <NumField value={form.mmse} onChange={set('mmse')} min={0} max={30} unit="/ 30" />
        </Field>
        <Field label="Daily Functioning Score (0–10)">
          <NumField value={form.functionalAssessment} onChange={set('functionalAssessment')} min={0} max={10} step={0.5} unit="/ 10" />
        </Field>
        <Field label="Activities of Daily Living (0–10)">
          <NumField value={form.adl} onChange={set('adl')} min={0} max={10} step={0.5} unit="/ 10" />
        </Field>
      </Section>

      {/* ── Observed Symptoms ── */}
      <Section title="Observed Symptoms" description="Behaviours and issues you've observed in your loved one.">
        <Field label="Memory Complaints">
          <YesNoToggle value={form.memoryComplaints} onChange={set('memoryComplaints')} />
        </Field>
        <Field label="Behavioural Problems">
          <YesNoToggle value={form.behavioralProblems} onChange={set('behavioralProblems')} />
        </Field>
        <Field label="Confusion">
          <YesNoToggle value={form.confusion} onChange={set('confusion')} />
        </Field>
        <Field label="Disorientation">
          <YesNoToggle value={form.disorientation} onChange={set('disorientation')} />
        </Field>
        <Field label="Personality Changes">
          <YesNoToggle value={form.personalityChanges} onChange={set('personalityChanges')} />
        </Field>
        <Field label="Difficulty Completing Tasks">
          <YesNoToggle value={form.difficultyCompletingTasks} onChange={set('difficultyCompletingTasks')} />
        </Field>
        <Field label="Forgetfulness">
          <YesNoToggle value={form.forgetfulness} onChange={set('forgetfulness')} />
        </Field>
      </Section>

      {/* Bottom save */}
      <div className="flex justify-end pb-10">
        <Button size="lg" onClick={handleSave} disabled={saving} className="px-8">
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Activity className="mr-2 h-5 w-5" />}
          Save & Get Risk Assessment
        </Button>
      </div>
    </div>
  );
}
