import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { trackId, trackName, artist, triggerType, associatedMemory, patientResponse } = await req.json();

    if (!trackId || !trackName) {
      return NextResponse.json({ error: 'Missing track information' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('music_sessions')
      .insert({
        patient_id: user.id,
        spotify_track_id: trackId,
        track_name: trackName,
        artist,
        trigger_type: triggerType || 'conversation',
        associated_memory: associatedMemory,
        patient_response: patientResponse,
        played_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Music session logged successfully', 
      data 
    });

  } catch (error: any) {
    console.error('Error logging music session:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
