import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET: fetch song requests based on caller's role ───────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine caller role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.role === 'patient') {
      // Patient: return their own requests
      const { data, error } = await supabase
        .from('song_requests')
        .select('*')
        .eq('patient_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data: data ?? [] });
    }

    if (profile.role === 'caregiver') {
      // Caregiver: return pending requests for their linked patient
      const { data: rel } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .single();

      if (!rel) {
        return NextResponse.json({ data: [] });
      }

      const { data, error } = await supabase
        .from('song_requests')
        .select('*')
        .eq('patient_id', rel.patient_id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data: data ?? [] });
    }

    return NextResponse.json({ error: 'Unknown role' }, { status: 403 });
  } catch (error: any) {
    console.error('GET /api/music/request error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ── POST: patient creates a song request ──────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { track_name, artist, spotify_track_id, album_art, source } = body;

    if (!track_name?.trim()) {
      return NextResponse.json({ error: 'track_name is required' }, { status: 400 });
    }

    const { data: newRequest, error } = await supabase
      .from('song_requests')
      .insert([
        {
          patient_id: user.id,
          track_name: track_name.trim(),
          artist: artist ?? null,
          spotify_track_id: spotify_track_id ?? null,
          album_art: album_art ?? null,
          source: source ?? 'patient',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/music/request error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
