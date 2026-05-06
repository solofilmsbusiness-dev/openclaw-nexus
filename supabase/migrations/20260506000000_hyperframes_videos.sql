CREATE TABLE hyperframes_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  status TEXT NOT NULL DEFAULT 'processing',
  video_url TEXT,
  scenes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX hyperframes_videos_user_id_idx ON hyperframes_videos (user_id);
CREATE INDEX hyperframes_videos_created_at_idx ON hyperframes_videos (created_at DESC);

ALTER TABLE hyperframes_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own videos"
  ON hyperframes_videos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_hyperframes_videos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER hyperframes_videos_updated_at
  BEFORE UPDATE ON hyperframes_videos
  FOR EACH ROW EXECUTE FUNCTION update_hyperframes_videos_updated_at();
