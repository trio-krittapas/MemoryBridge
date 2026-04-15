import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '@/lib/ratelimit';

// Limits: 5 summary requests per user per hour
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const rl = checkRateLimit(`user:${user.id}:summary`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return rateLimitResponse(rl);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 3. Authorization — callers may only fetch summaries they are allowed to view.
    //    Accept the request if they are fetching their own data, or if they have a
    //    caregiver link to that patient.
    if (userId !== user.id) {
      const { data: link } = await supabase
        .from('caregiver_patient_links')
        .select('id')
        .eq('caregiver_id', user.id)
        .eq('patient_id', userId)
        .maybeSingle();

      if (!link) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('patient_id', userId)
      .gte('created_at', last24h)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ summary: "No conversations recorded in the last 24 hours." });
    }

    const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const { text } = await generateText({
      model: getModel() as any,
      prompt: `Analyze the following conversation logs for an elderly patient and provide a concise, professional summary for a caregiver.
      Format:
      - TOPICS: [Main subjects discussed]
      - TONE: [Overall emotional state: happy, confused, anxious, stable]
      - HIGHLIGHTS: [Notable memories or concerns mentioned]
      - RECALL: [Was there any evidence of word-finding difficulty or confusion?]

      LOGS:
      ${conversationText}`,
    });

    return NextResponse.json({ summary: text }, { headers: rateLimitHeaders(rl) });

  } catch (error: any) {
    console.error('Summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
