'use client'

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import WellnessGauge from "@/components/dashboard/WellnessGauge";
import TrendsChart from "@/components/dashboard/TrendsChart";
import SpeechCognitionCard from "@/components/dashboard/SpeechCognitionCard";
import { calculateWellnessScore, WellnessMetrics } from "@/lib/utils/wellness-score";
import { detectAnomaly } from "@/lib/utils/anomaly-detection";
import {
  Loader2, AlertCircle, MessageSquare, TrendingUp, Music,
  Brain, Sparkles, Activity, HeartPulse, AlertTriangle, CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ── Unified risk helper ────────────────────────────────────────────────────
function computeUnifiedRisk(
  wellnessScore: number,
  mlRisk: number | null,
  cognitiveFlags: number,
  totalSessions: number,
): { label: string; score: number; color: string; description: string } {
  // Combine three signals with equal weight:
  //  1. Inverted wellness (lower wellness = higher risk)
  //  2. ML Alzheimer's risk from health form
  //  3. Cognitive flag rate from speech sessions
  const wellnessRisk  = 100 - wellnessScore;
  const mlRiskVal     = mlRisk ?? 50;
  const flagRate      = totalSessions > 0 ? (cognitiveFlags / totalSessions) * 100 : 0;
  const unifiedScore  = Math.round((wellnessRisk * 0.35) + (mlRiskVal * 0.45) + (flagRate * 0.20));

  const label = unifiedScore >= 65 ? 'HIGH' : unifiedScore >= 35 ? 'MODERATE' : 'LOW';
  const color = label === 'HIGH' ? 'text-red-600' : label === 'MODERATE' ? 'text-amber-600' : 'text-emerald-600';
  const description =
    label === 'HIGH'     ? 'Multiple signals indicate elevated cognitive risk. Clinical consultation recommended.' :
    label === 'MODERATE' ? 'Some indicators present across behaviour, speech, and health data. Monitor closely.' :
                           'Combined signals indicate stable cognitive health. Continue regular monitoring.';

  return { label, score: Math.min(unifiedScore, 100), color, description };
}

// ── Signal pill ─────────────────────────────────────────────────────────────
function SignalPill({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl border text-center ${
      good ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
    }`}>
      <span className={`text-base font-black ${good ? 'text-emerald-700' : 'text-red-700'}`}>{value}</span>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${good ? 'text-emerald-500' : 'text-red-500'}`}>{label}</span>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function CaregiverDashboard() {
  const [loading, setLoading]         = useState(true);
  const [patient, setPatient]         = useState<any>(null);
  const [patientId, setPatientId]     = useState<string>('');
  const [trends, setTrends]           = useState<any[]>([]);
  const [summary, setSummary]         = useState<string>("");
  const [anomaly, setAnomaly]         = useState<any>(null);
  const [overallScore, setOverallScore] = useState(0);
  const [healthRisk, setHealthRisk]   = useState<{ risk_score: number; risk_label: string; risk_description: string } | null>(null);
  const [cognitiveFlags, setCognitiveFlags] = useState(0);
  const [totalSessions, setTotalSessions]   = useState(0);
  const [avgExerciseScore, setAvgExerciseScore] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Linked patient
        const { data: rel } = await supabase
          .from('care_relationships')
          .select('patient_id, user_profiles:patient_id(display_name)')
          .eq('caregiver_id', user.id)
          .single();

        if (!rel) { setLoading(false); return; }

        setPatient(rel.user_profiles);
        const pid = rel.patient_id;
        setPatientId(pid);

        // 2. Trends + AI summary + health risk — parallel fetches
        const [trendRes, summaryRes, healthRes] = await Promise.all([
          fetch(`/api/dashboard/trends?userId=${pid}&days=14`),
          fetch(`/api/chat/summary?userId=${pid}`),
          fetch('/api/patient/health'),
        ]);

        const trendData    = await trendRes.json();
        const summaryData  = await summaryRes.json();
        const healthJson   = await healthRes.json();

        setTrends(trendData);
        setSummary(summaryData.summary);

        if (healthJson.data?.risk_score != null) {
          setHealthRisk({
            risk_score:       healthJson.data.risk_score,
            risk_label:       healthJson.data.risk_label,
            risk_description: healthJson.data.risk_description,
          });
        }

        // 3. Fetch speech cognition flags from cognitive_scores
        const { data: speechData } = await supabase
          .from('cognitive_scores')
          .select('cognitive_flag, wellness_score')
          .eq('patient_id', pid)
          .order('recorded_at', { ascending: false })
          .limit(14);

        if (speechData) {
          setTotalSessions(speechData.length);
          setCognitiveFlags(speechData.filter(s => s.cognitive_flag).length);
        }

        // 4. Fetch avg exercise score (real, not hardcoded)
        const { data: exerciseData } = await supabase
          .from('exercise_scores')
          .select('score, max_score')
          .eq('patient_id', pid)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (exerciseData && exerciseData.length > 0) {
          const avg = exerciseData.reduce((acc, curr) => {
            const pct = curr.max_score > 0 ? (curr.score / curr.max_score) * 100 : curr.score;
            return acc + pct;
          }, 0) / exerciseData.length;
          setAvgExerciseScore(Math.round(avg));
        }

        // 5. Wellness score + anomaly detection
        if (trendData.length > 0) {
          const latest     = trendData[trendData.length - 1];
          const historical = trendData.slice(0, -1).map((d: any) =>
            calculateWellnessScore({
              speechStability:    d.speech    || 80,
              exerciseAccuracy:   d.exercises || 80,
              recallRate:         80,
              interactionFrequency: Math.min((d.chat / 10) * 100, 100),
            })
          );

          const currentMetrics: WellnessMetrics = {
            speechStability:    latest.speech    || 80,
            exerciseAccuracy:   latest.exercises || 80,
            recallRate:         80,
            interactionFrequency: Math.min((latest.chat / 10) * 100, 100),
          };

          const currentScore = calculateWellnessScore(currentMetrics);
          setOverallScore(currentScore);
          setAnomaly(detectAnomaly(currentScore, historical));
        }

      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="bg-zinc-100 p-8 rounded-full mb-4">
          <Brain className="h-16 w-16 text-zinc-300" />
        </div>
        <h2 className="text-2xl font-bold">No Patient Link Found</h2>
        <p className="text-zinc-500 max-w-sm">
          Please link a patient account in Settings to start monitoring cognitive health.
        </p>
      </div>
    );
  }

  // Unified risk signal — combines ML risk + wellness + speech flags
  const unified = computeUnifiedRisk(
    overallScore,
    healthRisk?.risk_score ?? null,
    cognitiveFlags,
    totalSessions,
  );

  return (
    <div className="container max-w-7xl py-10 space-y-8 animate-in fade-in duration-700">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-xl text-zinc-500">
            Monitoring{' '}
            <span className="font-bold text-zinc-900 underline decoration-emerald-400/40">
              {patient.display_name}
            </span>
          </p>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-1 shrink-0">
          <div className="px-4 py-2 bg-white rounded-xl shadow-sm font-bold text-sm">Last 14 Days</div>
          <div className="px-4 py-2 hover:bg-zinc-200 rounded-xl transition-colors font-semibold text-zinc-500 text-sm cursor-pointer">30 Days</div>
        </div>
      </div>

      {/* ── Anomaly Alert ── */}
      {anomaly?.severity !== 'GREEN' && (
        <Alert
          variant={anomaly?.severity === 'RED' ? 'destructive' : 'default'}
          className="rounded-3xl border-2 animate-in slide-in-from-top-4"
        >
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">
            {anomaly?.severity === 'RED' ? 'Critical Alert' : 'Attention Required'}
          </AlertTitle>
          <AlertDescription className="text-sm font-medium">{anomaly?.message}</AlertDescription>
        </Alert>
      )}

      {/* ── Row 1: Unified Risk + Vitality + AI Insight ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Unified Risk Score — col 1-4 */}
        <div className="lg:col-span-4">
          <Card className={`h-full border-2 rounded-[3rem] overflow-hidden shadow-lg ${
            unified.label === 'HIGH'     ? 'bg-red-50 border-red-200' :
            unified.label === 'MODERATE' ? 'bg-amber-50 border-amber-200' :
                                           'bg-emerald-50 border-emerald-200'
          }`}>
            <CardContent className="pt-8 pb-6 px-6 flex flex-col items-center text-center gap-4">
              <div className={`p-3 rounded-2xl ${
                unified.label === 'HIGH' ? 'bg-red-100' : unified.label === 'MODERATE' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                {unified.label !== 'LOW'
                  ? <AlertTriangle className={`h-8 w-8 ${unified.label === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`} />
                  : <CheckCircle className="h-8 w-8 text-emerald-600" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Combined Risk Index
                </p>
                <p className={`text-5xl font-black ${unified.color}`}>{unified.score}</p>
                <p className="text-xs text-zinc-500 mt-0.5">/ 100</p>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden border border-white/60 ${
                unified.label === 'HIGH' ? 'bg-red-100' : unified.label === 'MODERATE' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    unified.label === 'HIGH' ? 'bg-red-500' : unified.label === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${unified.score}%` }}
                />
              </div>
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${
                unified.label === 'HIGH'     ? 'bg-red-100 text-red-700 border-red-200' :
                unified.label === 'MODERATE' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                               'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                {unified.label} RISK
              </span>
              <p className="text-xs text-zinc-600 leading-relaxed">{unified.description}</p>

              {/* Signal breakdown pills */}
              <div className="grid grid-cols-3 gap-2 w-full mt-1">
                <SignalPill label="Wellness"     value={`${overallScore}`}        good={overallScore >= 60} />
                <SignalPill label="Health Risk"  value={healthRisk ? `${healthRisk.risk_score}` : '—'} good={!healthRisk || healthRisk.risk_score < 50} />
                <SignalPill label="Flagged"      value={`${cognitiveFlags}/${totalSessions}`}           good={cognitiveFlags === 0} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vitality Gauge — col 5-8 */}
        <div className="lg:col-span-4 flex">
          <Card className="w-full bg-emerald-50/50 border-emerald-100 shadow-xl rounded-[3rem] overflow-hidden flex flex-col justify-center border-2">
            <CardHeader className="pb-0 text-center">
              <div className="flex justify-center mb-2">
                <Activity className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-900 uppercase tracking-tighter">
                Vitality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WellnessGauge score={overallScore} size={240} />
              <div className="flex justify-center mt-4">
                <div className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg">
                  {overallScore >= 70 ? 'Optimal' : overallScore >= 40 ? 'Monitoring' : 'Consult'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Daily Insight — col 9-12 */}
        <div className="lg:col-span-4">
          <Card className="h-full bg-zinc-900 text-white shadow-xl rounded-[3rem] border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="h-28 w-28 text-emerald-400" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                AI Daily Insight
              </CardTitle>
              <CardDescription className="text-zinc-400 text-sm">Last 24 hours of conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-zinc-700/50 min-h-[120px]">
                <p className="text-sm leading-relaxed text-zinc-100">
                  {summary || "Analyzing interaction patterns... Insights appearing momentarily."}
                </p>
              </div>
              <div className="flex gap-3 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700 text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">Engagement</span>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700 text-sm">
                  <Music className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">Music Sessions</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 2: Speech Cognition Card (full width) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <SpeechCognitionCard patientId={patientId} />
        </div>
      </div>

      {/* ── Row 3: Trend Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrendsChart data={trends} title="Conversation Clarity"     dataKey="speech"    color="#10b981" />
        <TrendsChart data={trends} title="Exercise Performance"    dataKey="exercises" color="#8b5cf6" />
      </div>

      {/* ── Row 4: Engagement + Quick Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <TrendsChart data={trends} title="Daily Conversations" dataKey="chat" color="#f59e0b" />
        </div>
        <div className="lg:col-span-6">
          <Card className="h-full bg-zinc-50 border-zinc-200 rounded-[2rem] border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-zinc-500" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-zinc-200">
                  <span className="font-semibold text-zinc-600 text-sm">Exercise Accuracy (Avg)</span>
                  <span className={`text-xl font-black ${avgExerciseScore != null && avgExerciseScore >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {avgExerciseScore != null ? `${avgExerciseScore}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-zinc-200">
                  <span className="font-semibold text-zinc-600 text-sm">Check-in Sessions (14 days)</span>
                  <span className="text-xl font-black">{totalSessions}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-zinc-200">
                  <span className="font-semibold text-zinc-600 text-sm">Concerns Flagged</span>
                  <span className={`text-xl font-black ${cognitiveFlags > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {cognitiveFlags}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 5: Alzheimer's Risk (ML) — full width ── */}
      <Card className={`border-2 rounded-[3rem] overflow-hidden shadow-sm ${
        !healthRisk ? 'bg-zinc-50 border-zinc-200' :
        healthRisk.risk_label === 'HIGH'     ? 'bg-red-50 border-red-200' :
        healthRisk.risk_label === 'MODERATE' ? 'bg-amber-50 border-amber-200' :
                                               'bg-emerald-50 border-emerald-200'
      }`}>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4 shrink-0">
              <div className={`p-3 rounded-2xl ${
                !healthRisk ? 'bg-zinc-200' :
                healthRisk.risk_label === 'HIGH'     ? 'bg-red-100' :
                healthRisk.risk_label === 'MODERATE' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                {healthRisk?.risk_label === 'HIGH' ? (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                ) : healthRisk?.risk_label === 'MODERATE' ? (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4" /> Health Risk Assessment
                </p>
                <p className={`text-3xl font-black ${
                  !healthRisk ? 'text-zinc-400' :
                  healthRisk.risk_label === 'HIGH'     ? 'text-red-600' :
                  healthRisk.risk_label === 'MODERATE' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {healthRisk ? `${healthRisk.risk_score} / 100` : '—'}
                </p>
              </div>
            </div>
            {healthRisk ? (
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/60 rounded-full overflow-hidden border border-white">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      healthRisk.risk_label === 'HIGH'     ? 'bg-red-500' :
                      healthRisk.risk_label === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${healthRisk.risk_score}%` }}
                  />
                </div>
                <p className="text-sm text-zinc-600">{healthRisk.risk_description}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 flex-1">
                No risk assessment yet. Fill in the{' '}
                <a href="/health" className="underline font-semibold text-blue-600">Health Profile</a>{' '}
                to get a personalised health risk assessment.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
