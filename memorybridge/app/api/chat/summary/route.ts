import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = await createClient();
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

    return NextResponse.json({ summary: text });

  } catch (error: any) {
    console.error('Summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
