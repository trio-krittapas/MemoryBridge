import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function recomputeScoreFromDetails(
  exerciseType: string,
  providedScore: number,
  providedMaxScore: number,
  details: unknown,
): { score: number; maxScore: number } {
  const detailsRecord = typeof details === 'object' && details !== null
    ? (details as Record<string, unknown>)
    : {};

  let score = providedScore;
  let maxScore = providedMaxScore;

  if (exerciseType === 'object_naming') {
    const attempts = Array.isArray(detailsRecord.attempts) ? detailsRecord.attempts : [];
    if (attempts.length > 0) {
      score = attempts.filter((attempt) => {
        return typeof attempt === 'object'
          && attempt !== null
          && (attempt as Record<string, unknown>).isCorrect === true;
      }).length;
      const itemCount = Array.isArray(detailsRecord.items) ? detailsRecord.items.length : attempts.length;
      maxScore = maxScore > 0 ? maxScore : itemCount;
    }
  }

  if (exerciseType === 'category_fluency') {
    const validatedItems = Array.isArray(detailsRecord.validatedItems)
      ? detailsRecord.validatedItems
      : Array.isArray(detailsRecord.items)
      ? detailsRecord.items
      : [];

    const uniqueValidated = new Set(
      validatedItems
        .map((item: unknown) => String(item).trim().toLowerCase())
        .filter(Boolean),
    );

    if (uniqueValidated.size > 0 || validatedItems.length > 0) {
      score = uniqueValidated.size;
      maxScore = maxScore > 0 ? maxScore : 20;
    }
  }

  if (maxScore <= 0) {
    maxScore = Math.max(score, 1);
  }

  return { score, maxScore };
}

export async function POST(req: Request) {
  try {
    const { exerciseType, score, maxScore, details } = await req.json();

    if (!exerciseType || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch last 3 scores to determine adaptive difficulty
    const { data: previousScores } = await supabase
      .from('exercise_scores')
      .select('score, max_score, difficulty_level')
      .eq('patient_id', user.id)
      .eq('exercise_type', exerciseType)
      .order('completed_at', { ascending: false })
      .limit(3);

    let currentDifficulty = 1;
    if (previousScores && previousScores.length > 0) {
      currentDifficulty = previousScores[0].difficulty_level || 1;

      // Only adjust if we have at least 3 recent data points for stability
      if (previousScores.length === 3) {
        const avgPercentage = previousScores.reduce((acc, curr) => {
          const safeMax = curr.max_score > 0 ? curr.max_score : 1;
          return acc + (curr.score / safeMax);
        }, 0) / 3;

        if (avgPercentage > 0.8) {
          currentDifficulty = Math.min(currentDifficulty + 1, 5);
        } else if (avgPercentage < 0.4) {
          currentDifficulty = Math.max(currentDifficulty - 1, 1);
        }
      }
    }

    const providedScore = toFiniteNumber(score, 0);
    const providedMaxScore = toFiniteNumber(maxScore, 0);
    const normalized = recomputeScoreFromDetails(exerciseType, providedScore, providedMaxScore, details);

    // 2. Save the new score with the adjusted difficulty
    const { data, error } = await supabase
      .from('exercise_scores')
      .insert({
        patient_id: user.id,
        exercise_type: exerciseType,
        score: normalized.score,
        max_score: normalized.maxScore,
        difficulty_level: currentDifficulty,
        details
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Score saved successfully', 
      nextDifficulty: currentDifficulty,
      scoredFromDetails: normalized.score !== providedScore,
      data 
    });

  } catch (error: unknown) {
    console.error('Error saving exercise score:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
