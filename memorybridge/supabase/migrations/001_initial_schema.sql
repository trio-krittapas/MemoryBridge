-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Users (via Supabase Auth, extended)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'patient')),
  display_name TEXT NOT NULL,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Caregiver-Patient relationship
CREATE TABLE care_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID REFERENCES user_profiles(id),
  patient_id UUID REFERENCES user_profiles(id),
  relationship TEXT, -- e.g., 'son', 'daughter', 'spouse'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(caregiver_id, patient_id)
);

-- Patient Life Story Profile (for RAG)
CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  section TEXT NOT NULL, -- 'childhood', 'family', 'career', 'hobbies', etc.
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profile Embeddings (pgvector)
CREATE TABLE profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  profile_section_id UUID REFERENCES patient_profiles(id),
  chunk_text TEXT NOT NULL,
  embedding vector(768), -- nomic-embed-text dimension (or 1536 for OpenAI)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  language TEXT,
  metadata JSONB, -- RAG context used, mood detected, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cognitive Scores (from daily speech analysis)
CREATE TABLE cognitive_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  word_count INTEGER,
  speech_rate FLOAT, -- words per minute
  type_token_ratio FLOAT,
  mean_length_utterance FLOAT,
  filler_word_count INTEGER,
  pause_count INTEGER,
  avg_pause_duration FLOAT, -- seconds
  jitter FLOAT,
  shimmer FLOAT,
  f0_mean FLOAT,
  f0_std FLOAT,
  hnr FLOAT,
  wellness_score FLOAT, -- composite 0-100
  audio_url TEXT, -- Supabase Storage path
  transcript TEXT
);

-- Exercise Scores
CREATE TABLE exercise_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('object_naming', 'word_recall', 'category_fluency')),
  score FLOAT NOT NULL,
  max_score FLOAT,
  details JSONB, -- items presented, responses, timing
  difficulty_level INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Music Sessions
CREATE TABLE music_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  spotify_track_id TEXT,
  track_name TEXT,
  artist TEXT,
  trigger_type TEXT CHECK (trigger_type IN ('conversation', 'mood', 'scheduled', 'manual')),
  associated_memory TEXT,
  patient_response TEXT, -- AI-summarized response after song
  played_at TIMESTAMPTZ DEFAULT now()
);

-- Memory Playlist
CREATE TABLE memory_playlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id),
  spotify_track_id TEXT,
  track_name TEXT NOT NULL,
  artist TEXT,
  era TEXT, -- e.g., '1960s', '1970s'
  genre TEXT,
  associated_memory TEXT, -- caregiver's note about why this song matters
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_playlist ENABLE ROW LEVEL SECURITY;

-- Vector matching function for RAG
CREATE OR REPLACE FUNCTION match_profile_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_patient_id uuid
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.chunk_text,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM profile_embeddings pe
  WHERE pe.patient_id = p_patient_id
    AND 1 - (pe.embedding <=> query_embedding) > match_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
