import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        const avgPercentage = previousScores.reduce((acc, curr) => acc + (curr.score / curr.max_score), 0) / 3;

        if (avgPercentage > 0.8) {
          currentDifficulty = Math.min(currentDifficulty + 1, 5);
        } else if (avgPercentage < 0.4) {
          currentDifficulty = Math.max(currentDifficulty - 1, 1);
        }
      }
    }

    // 2. Save the new score with the adjusted difficulty
    const { data, error } = await supabase
      .from('exercise_scores')
      .insert({
        patient_id: user.id,
        exercise_type: exerciseType,
        score,
        max_score: maxScore,
        difficulty_level: currentDifficulty,
        details
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Score saved successfully', 
      nextDifficulty: currentDifficulty,
      data 
    });

  } catch (error: any) {
    console.error('Error saving exercise score:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
