'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { Music, Play, Loader2, Disc, Send } from 'lucide-react'
import { toast } from 'sonner'

type RequestStatus = 'pending' | 'approved' | 'dismissed'

interface SongRequest {
  id: string
  track_name: string
  artist: string | null
  status: RequestStatus
  requested_at: string
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; classes: string }> = {
  pending: {
    label: 'Pending...',
    classes: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'Added to Playlist \u2713',
    classes: 'bg-green-100 text-green-700 border border-green-200',
  },
  dismissed: {
    label: 'Not Available',
    classes: 'bg-zinc-100 text-zinc-500 border border-zinc-200',
  },
}

export default function MusicTherapyPage() {
  const [playlist, setPlaylist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)

  // Request tab state
  const [trackName, setTrackName] = useState('')
  const [artist, setArtist] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requests, setRequests] = useState<SongRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function loadPlaylist() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('memory_playlist')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setPlaylist(data)
      setLoading(false)
    }
    loadPlaylist()
  }, [])

  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await fetch('/api/music/request')
        if (!res.ok) throw new Error('Failed to load requests')
        const json = await res.json()
        setRequests(json.data ?? [])
      } catch {
        // Silently fail — requests list is non-critical
      } finally {
        setRequestsLoading(false)
      }
    }
    loadRequests()
  }, [])

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackName.trim()) return

    setRequesting(true)
    try {
      const res = await fetch('/api/music/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_name: trackName.trim(),
          artist: artist.trim() || undefined,
          source: 'patient',
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const json = await res.json()
      const newRequest: SongRequest = json.data

      setRequests((prev) => [newRequest, ...prev])
      setTrackName('')
      setArtist('')
      toast.success('Song requested! Your caregiver will review it.')
    } catch {
      toast.error('Could not submit your request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto px-4 md:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
          <Music className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Music Therapy</h1>
        <p className="text-lg text-zinc-500 font-medium">Songs to bring back beautiful memories.</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="playlist" className="w-full">
        <TabsList className="w-full h-12 rounded-2xl bg-amber-50 border-2 border-amber-100 p-1">
          <TabsTrigger
            value="playlist"
            className="flex-1 h-full rounded-xl text-base font-semibold data-active:bg-amber-600 data-active:text-white data-active:shadow-sm transition-all"
          >
            My Playlist
          </TabsTrigger>
          <TabsTrigger
            value="request"
            className="flex-1 h-full rounded-xl text-base font-semibold data-active:bg-amber-600 data-active:text-white data-active:shadow-sm transition-all"
          >
            Request a Song
          </TabsTrigger>
        </TabsList>

        {/* --- Tab 1: My Playlist (existing content unchanged) --- */}
        <TabsContent value="playlist" className="mt-6 space-y-4">
          {playlist.length === 0 ? (
            <Card className="bg-zinc-50 border-dashed border-2 p-10 text-center rounded-[2rem]">
              <Disc className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500">Your playlist is empty right now. Your caregiver can add songs for you!</p>
            </Card>
          ) : (
            playlist.map((track) => (
              <Card
                key={track.id}
                className={`overflow-hidden transition-all duration-300 rounded-[2rem] border-2 ${
                  playingTrack === track.spotify_track_id
                    ? 'border-amber-400 shadow-xl scale-[1.02]'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="p-1">
                  <div className="flex items-center p-4 md:p-6 gap-4 md:gap-6 bg-white rounded-[1.75rem]">
                    <div className="relative w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center overflow-hidden shrink-0">
                      <Music className="h-8 w-8 text-amber-600 absolute" />
                      {playingTrack === track.spotify_track_id && (
                        <div className="absolute inset-0 bg-amber-600/90 flex items-center justify-center gap-1">
                          <span className="w-1.5 h-4 bg-white rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-6 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-3 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-zinc-900 truncate">{track.track_name}</h3>
                      <p className="text-zinc-500 font-medium truncate">{track.artist}</p>
                    </div>
                    <Button
                      variant={playingTrack === track.spotify_track_id ? 'default' : 'secondary'}
                      size="icon"
                      className={`rounded-full h-14 w-14 shrink-0 transition-all ${
                        playingTrack === track.spotify_track_id
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-lg'
                          : ''
                      }`}
                      onClick={() =>
                        setPlayingTrack(
                          track.spotify_track_id === playingTrack ? null : track.spotify_track_id
                        )
                      }
                    >
                      <Play
                        className={`h-6 w-6 ${
                          playingTrack === track.spotify_track_id
                            ? 'fill-white text-white'
                            : 'fill-zinc-900 text-zinc-900 ml-1'
                        }`}
                      />
                    </Button>
                  </div>
                </div>

                {playingTrack === track.spotify_track_id && (
                  <div className="bg-zinc-50 p-2 animate-in slide-in-from-top-2">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${track.spotify_track_id}?utm_source=generator`}
                      width="100%"
                      height="152"
                      style={{ border: 0 }}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-2xl"
                    ></iframe>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* --- Tab 2: Request a Song --- */}
        <TabsContent value="request" className="mt-6 space-y-6">
          {/* Request form */}
          <Card className="rounded-[2rem] border-2 border-amber-100 bg-amber-50/40 overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-xl font-bold text-zinc-900 mb-1">Request a Song</h2>
              <p className="text-sm text-zinc-500 mb-6">
                Your caregiver will be notified and can add it to your playlist.
              </p>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-zinc-700" htmlFor="track-name">
                    Song Name <span className="text-amber-600">*</span>
                  </label>
                  <Input
                    id="track-name"
                    placeholder="e.g. Yesterday"
                    value={trackName}
                    onChange={(e) => setTrackName(e.target.value)}
                    required
                    className="h-12 rounded-xl border-2 border-amber-200 bg-white text-base px-4 focus-visible:border-amber-400 focus-visible:ring-amber-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-zinc-700" htmlFor="artist">
                    Artist <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    id="artist"
                    placeholder="e.g. The Beatles"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="h-12 rounded-xl border-2 border-amber-200 bg-white text-base px-4 focus-visible:border-amber-400 focus-visible:ring-amber-200"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={requesting || !trackName.trim()}
                  className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base shadow-sm transition-all disabled:opacity-60"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past requests list */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-zinc-700 px-1">Your Past Requests</h3>

            {requestsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : requests.length === 0 ? (
              <Card className="bg-zinc-50 border-dashed border-2 p-8 text-center rounded-[2rem]">
                <p className="text-zinc-400 text-sm">No requests yet. Ask for a song above!</p>
              </Card>
            ) : (
              requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
                return (
                  <Card
                    key={req.id}
                    className="rounded-2xl border-2 border-zinc-100 bg-white overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Music className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-900 truncate">{req.track_name}</p>
                        {req.artist && (
                          <p className="text-sm text-zinc-500 truncate">{req.artist}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.classes}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
