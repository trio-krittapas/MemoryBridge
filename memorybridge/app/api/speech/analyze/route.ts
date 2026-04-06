import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateWellnessScore, WellnessMetrics } from '@/lib/utils/wellness-score';

const PYTHON_SIDECAR_URL = process.env.PYTHON_SIDECAR_URL || 'http://localhost:8000';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as Blob;
    const patientId = formData.get('patientId') as string;

    if (!audioFile || !patientId) {
      return NextResponse.json({ error: 'Missing audio file or patientId' }, { status: 400 });
    }

    // 1. Call Python Sidecar for Analysis
    const sidecarFormData = new FormData();
    sidecarFormData.append('file', audioFile, 'recording.wav');

    const sidecarResponse = await fetch(`${PYTHON_SIDECAR_URL}/analyze`, {
      method: 'POST',
      body: sidecarFormData,
    });

    if (!sidecarResponse.ok) {
      const errorText = await sidecarResponse.text();
      console.error('Python sidecar error:', errorText);
      return NextResponse.json({ error: 'Speech analysis failed' }, { status: 500 });
    }

    const { transcript, linguistic, acoustic } = await sidecarResponse.json();

    // 2. Fetch baseline/recent data for Wellness Score
    const supabase = await createClient();
    
    // Get recent exercise scores
    const { data: recentExercises } = await supabase
      .from('exercise_scores')
      .select('score')
      .eq('patient_id', patientId)
      .order('completed_at', { ascending: false })
      .limit(5);

    const avgExercise = recentExercises && recentExercises.length > 0
      ? recentExercises.reduce((acc, curr) => acc + curr.score, 0) / recentExercises.length
      : 70; // Baseline default

    // Get recent chat volume
    const { count: chatCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const interactionScore = Math.min((chatCount || 0) * 10, 100);

    // 3. Compute Wellness Score
    // Normalize sidecar metrics to 0-100 for the algorithm
    // (Simplified normalization for demo)
    const speechStability = Math.min(Math.max((linguistic.speech_rate || 1.5) * 40, 0), 100);
    
    const metrics: WellnessMetrics = {
      speechStability,
      exerciseAccuracy: avgExercise,
      recallRate: 75, // Mock or fetch from recall exercises
      interactionFrequency: interactionScore,
    };

    const wellnessScore = calculateWellnessScore(metrics);

    // 4. Store in cognitive_scores
    const { data, error } = await supabase
      .from('cognitive_scores')
      .insert({
        patient_id: patientId,
        word_count: linguistic.word_count,
        speech_rate: linguistic.speech_rate,
        type_token_ratio: linguistic.type_token_ratio,
        mean_length_utterance: linguistic.mean_length_utterance,
        filler_word_count: linguistic.filler_word_count,
        pause_count: linguistic.pause_count,
        avg_pause_duration: linguistic.avg_pause_duration,
        jitter: acoustic.jitter,
        shimmer: acoustic.shimmer,
        f0_mean: acoustic.f0_mean,
        f0_std: acoustic.f0_std,
        hnr: acoustic.hnr,
        wellness_score: wellnessScore,
        transcript: transcript,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Speech analyzed and scored successfully', 
      wellnessScore,
      data 
    });

  } catch (error: any) {
    console.error('Speech analysis API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
