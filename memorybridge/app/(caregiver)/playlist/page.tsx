'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Music, Search, PlusCircle, Trash2, Library } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

function PlaylistContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [playlist, setPlaylist] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // 1. Initial State: Check for token in localStorage
    const savedTokenData = localStorage.getItem('spotify_token_data')
    if (savedTokenData) {
      const { access_token, expires_at } = JSON.parse(savedTokenData)
      if (Date.now() < expires_at) {
        setToken(access_token)
      }
    }

    // 2. Auth Flow: Check for code parameter after redirect
    const code = searchParams.get('code')
    if (code && !token) {
      exchangeCodeForToken(code)
    }

    loadPlaylist()
  }, [])

  const exchangeCodeForToken = async (code: string) => {
    try {
      setLoading(true)
      const verifier = localStorage.getItem('spotify_code_verifier')
      
      const params = new URLSearchParams({
        client_id: CLIENT_ID!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI!,
        code_verifier: verifier!,
      })

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error_description)

      const tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      }

      localStorage.setItem('spotify_token_data', JSON.stringify(tokenData))
      setToken(data.access_token)
      toast.success('Successfully connected to Spotify!')
      
      // Cleanup URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (err: any) {
      toast.error('Spotify connection failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPlaylist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rel } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .single()

      if (rel) {
        const { data: playlistItems } = await supabase
          .from('memory_playlist')
          .select('*')
          .eq('patient_id', rel.patient_id)
          .order('created_at', { ascending: false })

        if (playlistItems) setPlaylist(playlistItems)
      }
    } catch (err) {
      console.error('Error loading playlist:', err)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !token) return

    try {
      setIsSearching(true)
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.tracks) setSearchResults(data.tracks.items)
    } catch (err: any) {
      console.error('Search failed:', err)
      toast.error('Search failed: ' + err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddToPlaylist = async (track: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: rel } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .single()

      if (!rel) throw new Error('No linked patient found')

      const { error } = await supabase
        .from('memory_playlist')
        .insert({
          patient_id: rel.patient_id,
          spotify_track_id: track.id,
          track_name: track.name,
          artist: track.artists[0].name,
          associated_memory: '' // Caregiver can edit afterward
        })

      if (error) throw error

      toast.success('Track added to memory playlist!')
      loadPlaylist()
      setSearchResults([])
      setSearchQuery('')
    } catch (err: any) {
      toast.error('Failed to add track: ' + err.message)
    }
  }

  const handleRemoveTrack = async (id: string) => {
    try {
      const { error } = await supabase
        .from('memory_playlist')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPlaylist(prev => prev.filter(t => t.id !== id))
      toast.success('Track removed')
    } catch (err: any) {
      toast.error('Failed to remove track: ' + err.message)
    }
  }

  const loginWithSpotify = async () => {
    // Generate state, verifier and challenge for PKCE
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem('spotify_code_verifier', verifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID!,
      response_type: 'code',
      redirect_uri: REDIRECT_URI!,
      scope: 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state',
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Helper functions as defined in lib/spotify/auth.ts (duplicated here for direct demo implementation)
  const generateCodeVerifier = (length: number) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  const generateCodeChallenge = async (codeVerifier: string) => {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  return (
    <div className="container max-w-5xl py-10 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Playlist</h1>
          <p className="text-muted-foreground">
            Curate meaningful songs from the patient's youth to trigger happy memories.
          </p>
        </div>
        {!token ? (
          <Button size="lg" onClick={loginWithSpotify} className="bg-emerald-600 hover:bg-emerald-700">
            <Music className="mr-2 h-5 w-5" />
            Connect Spotify
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => localStorage.removeItem('spotify_token_data')} className="text-zinc-500">
            Connected to Spotify
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Search Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className={!token ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Add New Songs</CardTitle>
              <CardDescription>Search for songs by artist or title</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="e.g. Teresa Teng, Xinyao, Chan Mali Chan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" size="icon" disabled={isSearching || !token}>
                  {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-6 space-y-4">
                {searchResults.map((track) => (
                  <div key={track.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-zinc-300 transition-colors">
                    <div className="flex items-center gap-3">
                      {track.album.images[0] && (
                        <div className="relative w-12 h-12 rounded overflow-hidden shadow-sm">
                          <Image src={track.album.images[0].url} alt={track.name} fill />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm line-clamp-1">{track.name}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{track.artists[0].name}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleAddToPlaylist(track)}>
                      <PlusCircle className="h-5 w-5 text-emerald-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Playlist Column */}
        <div className="lg:col-span-7">
          <Card className="min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Patient Playlist</CardTitle>
                <CardDescription>{playlist.length} songs in the collection</CardDescription>
              </div>
              <Library className="h-5 w-5 text-zinc-400" />
            </CardHeader>
            <CardContent>
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="bg-zinc-100 p-6 rounded-full">
                    <Music className="h-10 w-10 text-zinc-300" />
                  </div>
                  <div className="max-w-[200px]">
                    <p className="text-sm font-medium text-zinc-500">No songs added yet. Start searching beside!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {playlist.map((track) => (
                    <div key={track.id} className="group flex flex-col p-4 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-zinc-100 rounded-lg text-emerald-600">
                            <Music className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col">
                            <h3 className="font-bold">{track.track_name}</h3>
                            <p className="text-sm text-zinc-500">{track.artist}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveTrack(track.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PlaylistManager() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    }>
      <PlaylistContent />
    </Suspense>
  )
}
