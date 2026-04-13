'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, AlertTriangle, CheckCircle, RefreshCw, TrendingDown } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type CognitiveMarker = 'COHERENT' | 'REPETITIVE' | 'CONFUSED' | 'TANGENTIAL';

interface CognitionRow {
  recorded_at: string;
  dominant_cognitive_marker: CognitiveMarker | null;
  cognitive_flag: boolean;
  cognition_scores: Record<CognitiveMarker, number> | null;
  cognition_summary: string | null;
  wellness_score: number | null;
}

// ── Style config per marker ────────────────────────────────────────────────
const MARKER_CONFIG: Record<CognitiveMarker, { label: string; color: string; bg: string; bar: string }> = {
  COHERENT:   { label: 'Coherent',   color: 'text-emerald-700', bg: 'bg-emerald-100', bar: 'bg-emerald-500' },
  REPETITIVE: { label: 'Repetitive', color: 'text-amber-700',   bg: 'bg-amber-100',   bar: 'bg-amber-500'   },
  CONFUSED:   { label: 'Confused',   color: 'text-orange-700',  bg: 'bg-orange-100',  bar: 'bg-orange-500'  },
  TANGENTIAL: { label: 'Tangential', color: 'text-red-700',     bg: 'bg-red-100',     bar: 'bg-red-500'     },
};

const MARKERS: CognitiveMarker[] = ['COHERENT', 'REPETITIVE', 'CONFUSED', 'TANGENTIAL'];

// ── Trend calculation ──────────────────────────────────────────────────────
function getCognitiveTrend(sessions: CognitionRow[]): 'improving' | 'stable' | 'declining' {
  if (sessions.length < 2) return 'stable';
  const recent = sessions.slice(-3);
  const flagCount = recent.filter(s => s.cognitive_flag).length;
  const older = sessions.slice(0, -3);
  const oldFlagCount = older.length > 0 ? older.filter(s => s.cognitive_flag).length / older.length : 0;
  const recentFlagRate = flagCount / recent.length;
  if (recentFlagRate < oldFlagCount - 0.1) return 'improving';
  if (recentFlagRate > oldFlagCount + 0.1) return 'declining';
  return 'stable';
}

// ── Mini stacked bar for one session ──────────────────────────────────────
function SessionBar({ scores, date, marker }: {
  scores: Record<CognitiveMarker, number> | null;
  date: string;
  marker: CognitiveMarker | null;
}) {
  const config = marker ? MARKER_CONFIG[marker] : MARKER_CONFIG.COHERENT;
  const day = new Date(date).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className="w-full h-20 bg-zinc-100 rounded-lg overflow-hidden flex flex-col-reverse relative group cursor-default">
        {scores ? (
          MARKERS.map(m => (
            <div
              key={m}
              className={`w-full transition-all ${MARKER_CONFIG[m].bar}`}
              style={{ height: `${(scores[m] || 0) * 100}%` }}
            />
          ))
        ) : (
          <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
            <span className="text-xs text-zinc-400">—</span>
          </div>
        )}
        {/* Tooltip */}
        {scores && (
          <div className="absolute inset-0 bg-zinc-900/80 text-white text-[10px] p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg leading-tight space-y-0.5">
            {MARKERS.map(m => (
              <div key={m} className="flex justify-between gap-1">
                <span>{MARKER_CONFIG[m].label}</span>
                <span className="font-bold">{Math.round((scores[m] || 0) * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
        {config.label}
      </span>
      <span className="text-[10px] text-zinc-400">{day}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SpeechCognitionCard({ patientId }: { patientId: string }) {
  const [sessions, setSessions] = useState<CognitionRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!patientId) return;

    supabase
      .from('cognitive_scores')
      .select('recorded_at, dominant_cognitive_marker, cognitive_flag, cognition_scores, cognition_summary, wellness_score')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(7)
      .then(({ data }) => {
        setSessions((data ?? []).reverse() as CognitionRow[]);
        setLoading(false);
      });
  }, [patientId]);

  if (loading) {
    return (
      <Card className="rounded-[2rem] border border-zinc-200 animate-pulse">
        <CardContent className="h-48 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-zinc-300 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-zinc-200 bg-zinc-50">
        <CardContent className="h-40 flex flex-col items-center justify-center gap-2 text-center p-8">
          <Brain className="h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500 font-medium">No speech sessions yet.</p>
          <p className="text-xs text-zinc-400">The patient's daily recordings will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  const latest   = sessions[sessions.length - 1];
  const trend    = getCognitiveTrend(sessions);
  const flagged  = sessions.filter(s => s.cognitive_flag).length;
  const latestMarker = (latest.dominant_cognitive_marker as CognitiveMarker) ?? 'COHERENT';
  const latestConfig = MARKER_CONFIG[latestMarker];

  return (
    <Card className="rounded-[2rem] border border-zinc-200 overflow-hidden shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-600" />
              Speech Cognitive Markers
            </CardTitle>
            <CardDescription className="mt-1">
              Last {sessions.length} recording{sessions.length !== 1 ? 's' : ''} — analysed by NLP classifier
            </CardDescription>
          </div>

          {/* Trend badge */}
          <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
            trend === 'improving' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            trend === 'declining' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-zinc-100 text-zinc-600 border-zinc-200'
          }`}>
            {trend === 'declining' && <TrendingDown className="h-4 w-4" />}
            {trend === 'improving' && <CheckCircle className="h-4 w-4" />}
            {trend.charAt(0).toUpperCase() + trend.slice(1)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {/* Latest session summary */}
        <div className={`flex items-start gap-4 p-4 rounded-2xl border ${latestConfig.bg} border-opacity-50`}>
          <div className={`mt-0.5 ${latestConfig.color}`}>
            {latest.cognitive_flag
              ? <AlertTriangle className="h-6 w-6" />
              : <CheckCircle className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${latestConfig.color}`}>
                Most Recent: {latestConfig.label}
              </span>
              {latest.cognitive_flag && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold border border-red-200">
                  Flagged
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              {latest.cognition_summary || 'No summary available.'}
            </p>
          </div>
          {/* Marker score breakdown for latest */}
          {latest.cognition_scores && (
            <div className="shrink-0 space-y-1 text-right text-xs min-w-[90px]">
              {MARKERS.map(m => (
                <div key={m} className="flex items-center justify-end gap-1.5">
                  <span className="text-zinc-500">{MARKER_CONFIG[m].label}</span>
                  <div className="w-10 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={MARKER_CONFIG[m].bar}
                      style={{ width: `${(latest.cognition_scores![m] || 0) * 100}%`, height: '100%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session history stacked bars */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Session History</p>
          <div className="flex gap-2 items-end">
            {sessions.map((s, i) => (
              <SessionBar
                key={i}
                scores={s.cognition_scores}
                date={s.recorded_at}
                marker={s.dominant_cognitive_marker as CognitiveMarker | null}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-3 flex-wrap mt-3">
            {MARKERS.map(m => (
              <div key={m} className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className={`w-2.5 h-2.5 rounded-full ${MARKER_CONFIG[m].bar}`} />
                {MARKER_CONFIG[m].label}
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-50 rounded-2xl p-3 text-center border border-zinc-100">
            <p className="text-2xl font-black text-zinc-900">{sessions.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Sessions</p>
          </div>
          <div className={`rounded-2xl p-3 text-center border ${flagged > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-2xl font-black ${flagged > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{flagged}</p>
            <p className={`text-xs mt-0.5 ${flagged > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Flagged</p>
          </div>
          <div className="bg-zinc-50 rounded-2xl p-3 text-center border border-zinc-100">
            <p className="text-2xl font-black text-zinc-900">
              {latest.wellness_score != null ? Math.round(latest.wellness_score) : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Wellness</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
