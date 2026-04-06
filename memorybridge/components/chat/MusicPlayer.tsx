'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause, SkipForward, SkipBack, Loader2, Music as MusicIcon, X } from 'lucide-react'
import { getAccessToken } from '@/lib/spotify/auth'
import { toast } from 'sonner'
import { useMusicStore } from '@/lib/spotify/player-state'
import Image from 'next/image'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

export default function MusicPlayer() {
  const { 
    state, 
    currentTrackId, 
    suggestedTrackId, 
    confirmPlayback, 
    cancelSuggestion, 
    setPostSong, 
    reset 
  } = useMusicStore()
  
  const [player, setPlayer] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const playerRef = useRef<any>(null)
  const deviceIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (state === 'IDLE') return;

    // Load Spotify SDK
    if (!window.Spotify) {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)

      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    } else {
      initializePlayer();
    }

    function initializePlayer() {
      if (playerRef.current) return;

      const spotifyPlayer = new window.Spotify.Player({
        name: 'MemoryBridge AI Player',
        getOAuthToken: (cb: (token: string) => void) => {
          getAccessToken().then((token) => cb(token || ''))
        },
        volume: 0.5,
      })

      setPlayer(spotifyPlayer)
      playerRef.current = spotifyPlayer

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id
        setIsActive(true)
        console.log('Spotify Ready', device_id)
      })

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track)
        setIsPaused(state.paused)
        
        // Track completion logic
        if (state.position === 0 && state.paused && state.track_window.previous_tracks.length > 0) {
          setPostSong()
        }
      })

      spotifyPlayer.connect();
    }

    return () => {
      // We don't disconnect immediately because we want it persistent between suggests/plays
    }
  }, [state])

  useEffect(() => {
    if (state === 'PLAYING' && currentTrackId && isActive && player) {
      playTrack(currentTrackId)
    }
  }, [state, currentTrackId, isActive, player])

  const playTrack = async (id: string) => {
    try {
      setLoading(true)
      const token = await getAccessToken()
      const deviceId = deviceIdRef.current
      if (!deviceId) throw new Error('Player not ready yet, please wait a moment.')
      
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [`spotify:track:${id}`] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (!response.ok) {
        throw new Error('Please check if you have Spotify Premium and an active session.')
      }

      setIsPaused(false)
    } catch (err: any) {
      toast.error(err.message)
      reset()
    } finally {
      setLoading(false)
    }
  }

  if (state === 'IDLE') return null

  // SUGGESTION UI
  if (state === 'SUGGESTING') {
    return (
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-in zoom-in-95 duration-300">
        <Card className="bg-white/80 backdrop-blur-xl border-amber-200 shadow-2xl rounded-3xl overflow-hidden border-2">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <MusicIcon className="h-8 w-8 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-zinc-900">Suggested Memory</h3>
              <p className="text-zinc-600">Would you like to listen to this song together?</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-zinc-200" onClick={cancelSuggestion}>
                Maybe later
              </Button>
              <Button className="flex-1 rounded-2xl h-12 bg-amber-600 hover:bg-amber-700 shadow-md" onClick={confirmPlayback}>
                <Play className="mr-2 h-4 w-4 fill-current" />
                Listen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // PLAYER UI (PLAYING or POST_SONG)
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg animate-in slide-in-from-bottom-5 duration-500">
      <Card className="bg-zinc-900/90 backdrop-blur-2xl border-zinc-700/50 text-white shadow-2xl overflow-hidden rounded-[2.5rem] border">
        <div className="p-5 md:p-6 flex items-center gap-6">
          <div className="relative w-24 h-24 md:w-28 md:h-28 bg-zinc-800 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg group">
            {currentTrack?.album?.images[0] ? (
              <img src={currentTrack.album.images[0].url} className="w-full h-full object-cover rounded-3xl transition-transform duration-700 group-hover:scale-110" />
            ) : (
              <MusicIcon className="h-10 w-10 text-zinc-600" />
            )}
            {!isPaused && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-zinc-900">
                 <div className="w-1 h-3 bg-white rounded-full animate-bounce-slow mx-0.5" />
                 <div className="w-1 h-4 bg-white rounded-full animate-bounce-fast mx-0.5" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-bold truncate text-lg md:text-xl">{currentTrack?.name || 'Syncing...'}</h4>
                <p className="text-zinc-400 text-sm md:text-base truncate">{currentTrack?.artists[0]?.name || 'Spotify Player'}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white -mr-2" onClick={reset}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={() => player?.previousTrack()}>
                <SkipBack className="h-7 w-7" />
              </Button>
              <Button size="icon" className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl transform transition-transform hover:scale-105 active:scale-95" onClick={() => player?.togglePlay()}>
                {loading ? <Loader2 className="animate-spin h-8 w-8" /> : isPaused ? <Play className="h-8 w-8 fill-current translate-x-0.5" /> : <Pause className="h-8 w-8 fill-current" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={() => player?.nextTrack()}>
                <SkipForward className="h-7 w-7" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
