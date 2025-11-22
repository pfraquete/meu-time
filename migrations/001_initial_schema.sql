-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  birth_date DATE,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sports table
CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  min_players INT NOT NULL DEFAULT 2,
  max_players INT NOT NULL DEFAULT 22,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  email TEXT,
  website TEXT,
  amenities JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 90,
  min_players INT NOT NULL,
  max_players INT NOT NULL,
  current_players INT DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'any')),
  gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  min_age INT,
  max_age INT,
  status TEXT CHECK (status IN ('draft', 'open', 'full', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  recurrence TEXT CHECK (recurrence IN ('none', 'weekly', 'biweekly', 'monthly')),
  recurrence_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match participants table
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'declined', 'waitlist', 'attended', 'no_show')) DEFAULT 'pending',
  position TEXT,
  team TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(match_id, user_id)
);

-- Player stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
  matches_played INT DEFAULT 0,
  matches_organized INT DEFAULT 0,
  attendance_rate DECIMAL(5, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport_id)
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  rated_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rater_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  skill_rating INT CHECK (skill_rating >= 1 AND skill_rating <= 5),
  punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  fair_play_rating INT CHECK (fair_play_rating >= 1 AND fair_play_rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, rated_user_id, rater_user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for sports (read-only for all)
CREATE POLICY "Sports are viewable by everyone" ON sports FOR SELECT USING (true);

-- RLS Policies for venues (read-only for all)
CREATE POLICY "Venues are viewable by everyone" ON venues FOR SELECT USING (true);

-- RLS Policies for matches
CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their matches" ON matches FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete their matches" ON matches FOR DELETE USING (auth.uid() = organizer_id);

-- RLS Policies for match_participants
CREATE POLICY "Participants viewable by match members" ON match_participants FOR SELECT USING (true);
CREATE POLICY "Users can join matches" ON match_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their participation" ON match_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave matches" ON match_participants FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for player_stats
CREATE POLICY "Stats are viewable by everyone" ON player_stats FOR SELECT USING (true);

-- RLS Policies for ratings
CREATE POLICY "Ratings viewable by involved users" ON ratings FOR SELECT USING (auth.uid() = rated_user_id OR auth.uid() = rater_user_id);
CREATE POLICY "Users can rate others" ON ratings FOR INSERT WITH CHECK (auth.uid() = rater_user_id);

-- Create indexes for better performance
CREATE INDEX idx_matches_sport ON matches(sport_id);
CREATE INDEX idx_matches_organizer ON matches(organizer_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_match_participants_match ON match_participants(match_id);
CREATE INDEX idx_match_participants_user ON match_participants(user_id);
CREATE INDEX idx_player_stats_user ON player_stats(user_id);
CREATE INDEX idx_player_stats_sport ON player_stats(sport_id);
CREATE INDEX idx_ratings_rated_user ON ratings(rated_user_id);
CREATE INDEX idx_ratings_match ON ratings(match_id);
