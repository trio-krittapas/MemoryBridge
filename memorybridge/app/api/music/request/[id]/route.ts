import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── PATCH: caregiver approves or dismisses a song request ─────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is a caregiver
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.role !== 'caregiver') {
      return NextResponse.json({ error: 'Only caregivers can approve or dismiss song requests' }, { status: 403 });
    }

    const body = await req.json();
    const { action, spotify_track_id, track_name, artist, album_art, memory_note } = body;

    if (!action || !['approve', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "dismiss"' }, { status: 400 });
    }

    // Fetch the request to get patient_id (and confirm it belongs to a linked patient)
    const { data: songRequest, error: fetchError } = await supabase
      .from('song_requests')
      .select('id, patient_id, track_name, artist, spotify_track_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !songRequest) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }

    if (songRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been resolved' }, { status: 409 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Resolve the final track values (body fields override stored values)
      const resolvedTrackId = spotify_track_id ?? songRequest.spotify_track_id ?? null;
      const resolvedTrackName = track_name ?? songRequest.track_name;
      const resolvedArtist = artist ?? songRequest.artist ?? null;

      // 1. Update the song_requests row
      const { error: updateError } = await supabase
        .from('song_requests')
        .update({
          status: 'approved',
          resolved_at: now,
          spotify_track_id: resolvedTrackId,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 2. Insert into memory_playlist
      const { error: playlistError } = await supabase
        .from('memory_playlist')
        .insert([
          {
            patient_id: songRequest.patient_id,
            spotify_track_id: resolvedTrackId,
            track_name: resolvedTrackName,
            artist: resolvedArtist,
            associated_memory: memory_note || '',
          },
        ]);

      if (playlistError) throw playlistError;

      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss') {
      // Update the song_requests row to dismissed
      const { error: updateError } = await supabase
        .from('song_requests')
        .update({
          status: 'dismissed',
          resolved_at: now,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true });
    }

    // Should be unreachable given the validation above
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('PATCH /api/music/request/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
