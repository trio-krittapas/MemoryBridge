-- Create spotify_tokens table linked to user_profiles
CREATE TABLE IF NOT EXISTS spotify_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own tokens
CREATE POLICY "Users can view own spotify tokens" 
  ON spotify_tokens FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spotify tokens" 
  ON spotify_tokens FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spotify tokens" 
  ON spotify_tokens FOR UPDATE 
  USING (auth.uid() = user_id);
