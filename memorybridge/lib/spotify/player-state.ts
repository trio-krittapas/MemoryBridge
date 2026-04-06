import { create } from 'zustand';

export type PlayerState = 'IDLE' | 'SUGGESTING' | 'PLAYING' | 'POST_SONG';

interface MusicStore {
  state: PlayerState;
  currentTrackId: string | null;
  currentTrackName: string | null;
  currentArtist: string | null;
  suggestedTrackId: string | null;
  
  // Actions
  setSuggesting: (trackId: string) => void;
  confirmPlayback: () => void;
  cancelSuggestion: () => void;
  setPlaying: (trackId: string) => void;
  setPostSong: () => void;
  reset: () => void;
}

export const useMusicStore = create<MusicStore>((set) => ({
  state: 'IDLE',
  currentTrackId: null,
  currentTrackName: null,
  currentArtist: null,
  suggestedTrackId: null,

  setSuggesting: (trackId) => set({ 
    state: 'SUGGESTING', 
    suggestedTrackId: trackId 
  }),

  confirmPlayback: () => set((state) => ({ 
    state: 'PLAYING', 
    currentTrackId: state.suggestedTrackId,
    suggestedTrackId: null 
  })),

  cancelSuggestion: () => set({ 
    state: 'IDLE', 
    suggestedTrackId: null 
  }),

  setPlaying: (trackId) => set({ 
    state: 'PLAYING', 
    currentTrackId: trackId,
    suggestedTrackId: null 
  }),

  setPostSong: () => set({ 
    state: 'POST_SONG' 
  }),

  reset: () => set({ 
    state: 'IDLE', 
    currentTrackId: null, 
    currentTrackName: null, 
    currentArtist: null, 
    suggestedTrackId: null 
  }),
}));
