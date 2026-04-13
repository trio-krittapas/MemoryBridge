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

    // 1. Call Python Sidecar — now returns linguistic, acoustic, nlp, cognition
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

    const { transcript, linguistic, acoustic, nlp, cognition } = await sidecarResponse.json();

    // 2. Fetch context data for Wellness Score
    const supabase = await createClient();

    const { data: recentExercises } = await supabase
      .from('exercise_scores')
      .select('score, max_score')
      .eq('patient_id', patientId)
      .order('completed_at', { ascending: false })
      .limit(5);

    const avgExercise = recentExercises && recentExercises.length > 0
      ? recentExercises.reduce((acc, curr) => {
          const pct = curr.max_score > 0 ? (curr.score / curr.max_score) * 100 : curr.score;
          return acc + pct;
        }, 0) / recentExercises.length
      : 70;

    // Fetch recent recall scores specifically for recall rate
    const { data: recallScores } = await supabase
      .from('exercise_scores')
      .select('score, max_score')
      .eq('patient_id', patientId)
      .eq('exercise_type', 'word_recall')
      .order('completed_at', { ascending: false })
      .limit(3);

    const recallRate = recallScores && recallScores.length > 0
      ? recallScores.reduce((acc, curr) => {
          const pct = curr.max_score > 0 ? (curr.score / curr.max_score) * 100 : curr.score;
          return acc + pct;
        }, 0) / recallScores.length
      : 75;

    const { count: chatCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const interactionScore = Math.min((chatCount || 0) * 10, 100);

    // 3. Compute Wellness Score
    // Penalise if cognitive flag is raised — reduce speech stability contribution
    const baseSpeechStability = Math.min(Math.max((linguistic.speech_rate || 1.5) * 40, 0), 100);
    const cognitiveDeduction  = cognition?.cognitive_flag ? 15 : 0;
    const speechStability     = Math.max(baseSpeechStability - cognitiveDeduction, 0);

    const metrics: WellnessMetrics = {
      speechStability,
      exerciseAccuracy:    avgExercise,
      recallRate,
      interactionFrequency: interactionScore,
    };

    const wellnessScore = calculateWellnessScore(metrics);

    // 4. Store everything in cognitive_scores (existing + new NLP/cognition columns)
    const { data, error } = await supabase
      .from('cognitive_scores')
      .insert({
        patient_id:            patientId,
        // Existing linguistic fields
        word_count:            linguistic.word_count,
        speech_rate:           linguistic.speech_rate,
        type_token_ratio:      linguistic.type_token_ratio,
        mean_length_utterance: linguistic.mean_length_utterance,
        filler_word_count:     linguistic.filler_word_count,
        pause_count:           linguistic.pause_count,
        avg_pause_duration:    linguistic.avg_pause_duration,
        // Existing acoustic fields — fixed field name mapping
        jitter:   acoustic.jitterLocal_shimmerLocal_mean ?? acoustic.jitter ?? null,
        shimmer:  acoustic.shimmer_mean ?? acoustic.shimmer ?? null,
        f0_mean:  acoustic.f0_mean,
        f0_std:   acoustic.f0_std,
        hnr:      acoustic.hnr_mean ?? acoustic.hnr ?? null,
        // New NLP metrics (Part B2)
        repetition_rate:           nlp?.repetition_rate ?? null,
        lexical_density:           nlp?.lexical_density ?? null,
        named_entity_count:        nlp?.named_entity_count ?? null,
        avg_sentence_length:       nlp?.avg_sentence_length ?? null,
        pronoun_noun_ratio:        nlp?.pronoun_noun_ratio ?? null,
        negation_count:            nlp?.negation_count ?? null,
        sentence_count:            nlp?.sentence_count ?? null,
        word_diversity:            nlp?.word_diversity ?? null,
        incomplete_sentence_rate:  nlp?.incomplete_sentence_rate ?? null,
        // New cognition classification (Part B2)
        dominant_cognitive_marker: cognition?.dominant_marker ?? null,
        cognitive_flag:            cognition?.cognitive_flag ?? false,
        cognition_scores:          cognition?.scores ?? null,
        cognition_summary:         cognition?.summary ?? null,
        cognition_method:          cognition?.method ?? null,
        // Composite score
        wellness_score:            wellnessScore,
        transcript:                transcript,
        recorded_at:               new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      message:      'Speech analyzed and scored successfully',
      wellnessScore,
      cognition,
      data,
    });

  } catch (error: any) {
    console.error('Speech analysis API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
