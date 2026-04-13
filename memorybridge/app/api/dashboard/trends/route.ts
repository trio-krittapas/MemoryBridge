import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfDay, subDays, format } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = await createClient();
    const startDate = subDays(new Date(), days).toISOString();

    // 1. Fetch Cognitive Scores (Speech Metrics)
    const { data: cognitiveData } = await supabase
      .from('cognitive_scores')
      .select('wellness_score, recorded_at, created_at')
      .eq('patient_id', userId)
      .gte('recorded_at', startDate)
      .order('recorded_at', { ascending: true });

    // 2. Fetch Exercise Scores
    const { data: exerciseData } = await supabase
      .from('exercise_scores')
      .select('score, max_score, completed_at')
      .eq('patient_id', userId)
      .gte('completed_at', startDate)
      .order('completed_at', { ascending: true });

    // 3. Fetch Interaction Counts (Chat)
    const { data: chatData } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('patient_id', userId)
      .eq('role', 'user')
      .gte('created_at', startDate);

    // 4. Data Processing: Bucket by day
    const trendData: any = {};
    
    // Initialize buckets
    for (let i = 0; i < days; i++) {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        trendData[d] = { date: d, speech: 0, exercises: 0, chat: 0, count: 0 };
    }

    cognitiveData?.forEach(row => {
        const d = format(new Date(row.recorded_at ?? row.created_at), 'yyyy-MM-dd');
        if (trendData[d]) {
            trendData[d].speech = row.wellness_score || 0;
        }
    });

    exerciseData?.forEach(row => {
        const d = format(new Date(row.completed_at), 'yyyy-MM-dd');
        if (trendData[d]) {
            const pct = row.max_score > 0 ? (row.score / row.max_score) * 100 : row.score;
            trendData[d].count++;
            trendData[d].exercises = trendData[d].exercises + (pct - trendData[d].exercises) / trendData[d].count;
        }
    });

    chatData?.forEach(row => {
        const d = format(new Date(row.created_at), 'yyyy-MM-dd');
        if (trendData[d]) {
            trendData[d].chat++;
        }
    });

    const result = Object.values(trendData).reverse();

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Trend fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
