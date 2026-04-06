'use client'

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import WellnessGauge from "@/components/dashboard/WellnessGauge";
import TrendsChart from "@/components/dashboard/TrendsChart";
import { calculateWellnessScore, WellnessMetrics } from "@/lib/utils/wellness-score";
import { detectAnomaly } from "@/lib/utils/anomaly-detection";
import { Loader2, AlertCircle, MessageSquare, TrendingUp, Music, Brain, Sparkles, Activity } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CaregiverDashboard() {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [anomaly, setAnomaly] = useState<any>(null);
  const [overallScore, setOverallScore] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get linked patient
        const { data: rel } = await supabase
          .from('care_relationships')
          .select('patient_id, user_profiles:patient_id(full_name)')
          .eq('caregiver_id', user.id)
          .single();

        if (!rel) {
          setLoading(false);
          return;
        }

        setPatient(rel.user_profiles);
        const pid = rel.patient_id;

        // 2. Fetch Trends
        const trendRes = await fetch(`/api/dashboard/trends?userId=${pid}&days=14`);
        const trendData = await trendRes.json();
        setTrends(trendData);

        // 3. Fetch AI Summary
        const summaryRes = await fetch(`/api/chat/summary?userId=${pid}`);
        const summaryData = await summaryRes.json();
        setSummary(summaryData.summary);

        // 4. Calculate Scores and Detect Anomalies
        if (trendData.length > 0) {
          const latest = trendData[trendData.length - 1];
          const historical = trendData.slice(0, -1).map((d: any) => 
            calculateWellnessScore({
              speechStability: d.speech || 80,
              exerciseAccuracy: d.exercises || 80,
              recallRate: 80, // Simulation placeholder
              interactionFrequency: (d.chat / 10) * 100 // Normalized to 10 chats/day
            })
          );

          const currentMetrics: WellnessMetrics = {
            speechStability: latest.speech || 80,
            exerciseAccuracy: latest.exercises || 80,
            recallRate: 80,
            interactionFrequency: (latest.chat / 10) * 100
          };

          const currentScore = calculateWellnessScore(currentMetrics);
          setOverallScore(currentScore);
          
          const anomalyResult = detectAnomaly(currentScore, historical);
          setAnomaly(anomalyResult);
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
        <p className="text-zinc-500 max-w-sm">Please link a patient account in your settings to start monitoring cognitive health.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-xl text-zinc-500">Monitoring cognitive health for <span className="font-bold text-zinc-900 underline decoration-emerald-500/30">{patient.full_name}</span></p>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-1">
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm font-bold text-sm">Last 14 Days</div>
           <div className="px-4 py-2 hover:bg-zinc-200 rounded-xl transition-colors font-semibold text-zinc-500 text-sm cursor-pointer">30 Days</div>
        </div>
      </div>

      {anomaly?.severity !== 'GREEN' && (
        <Alert variant={anomaly?.severity === 'RED' ? 'destructive' : 'default'} className="rounded-3xl border-2 animate-in slide-in-from-top-4">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">{anomaly?.severity === 'RED' ? 'Critical Alert' : 'Attention Required'}</AlertTitle>
          <AlertDescription className="text-sm font-medium">
            {anomaly?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Wellness Score Gauge (Col 1-4) */}
        <div className="lg:col-span-4 flex">
          <Card className="w-full bg-emerald-50/50 border-emerald-100 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col justify-center border-2">
            <CardHeader className="pb-0 text-center">
               <div className="flex justify-center mb-2">
                  <Activity className="h-6 w-6 text-emerald-600 animate-pulse-slow" />
               </div>
               <CardTitle className="text-xl font-bold text-emerald-900 uppercase tracking-tighter">Current Vitality</CardTitle>
            </CardHeader>
            <CardContent>
               <WellnessGauge score={overallScore} size={280} />
               <div className="flex justify-center mt-6">
                 <div className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg">
                    {overallScore >= 70 ? 'Optimal Performance' : overallScore >= 40 ? 'Under Monitoring' : 'Consulting Required'}
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insight Card (Col 5-12) */}
        <div className="lg:col-span-8">
          <Card className="h-full bg-zinc-900 text-white shadow-2xl rounded-[3rem] border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
               <Sparkles className="h-40 w-40 text-emerald-400" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <Sparkles className="h-7 w-7 text-emerald-500" />
                AI Daily Insight
              </CardTitle>
              <CardDescription className="text-zinc-400 text-lg">Synthesized from last 24 hours of conversation</CardDescription>
            </CardHeader>
            <CardContent className="mt-4">
               <div className="bg-zinc-800/50 backdrop-blur-md rounded-3xl p-8 border border-zinc-700/50 min-h-[180px]">
                  <p className="text-xl leading-relaxed text-zinc-100 whitespace-pre-line">
                     {summary || "Analyzing interaction patterns... Insights appearing momentarily."}
                  </p>
               </div>
               <div className="flex gap-4 mt-8 flex-wrap">
                  <div className="flex items-center gap-2 bg-zinc-800 px-5 py-2.5 rounded-2xl border border-zinc-700">
                     <TrendingUp className="h-5 w-5 text-emerald-400" />
                     <span className="font-semibold">Engagement Up 12%</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800 px-5 py-2.5 rounded-2xl border border-zinc-700">
                     <Music className="h-5 w-5 text-emerald-400" />
                     <span className="font-semibold">2 Nostalgic Sessions</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Cognitive Trends (Charts) */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
           <TrendsChart 
             data={trends} 
             title="Speech Rate Stability" 
             dataKey="speech" 
             color="#10b981" 
           />
           <TrendsChart 
             data={trends} 
             title="Exercise Performance" 
             dataKey="exercises" 
             color="#8b5cf6" 
           />
        </div>

        {/* Interaction Activity */}
        <div className="lg:col-span-6">
           <TrendsChart 
             data={trends} 
             title="Social Engagement Volume" 
             dataKey="chat" 
             color="#f59e0b" 
           />
        </div>

        <div className="lg:col-span-6">
           <Card className="h-full bg-zinc-100/50 border-zinc-200 rounded-[3rem] border shadow-sm">
             <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                   <MessageSquare className="h-6 w-6 text-zinc-500" />
                   Quick Summary
                </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-200">
                      <span className="font-bold text-zinc-600">Avg Session Duration</span>
                      <span className="text-xl font-black">12.5 min</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-200">
                      <span className="font-bold text-zinc-600">Recall Score (Avg)</span>
                      <span className="text-xl font-black text-emerald-600">84%</span>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
