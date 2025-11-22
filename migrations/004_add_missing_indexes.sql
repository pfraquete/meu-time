-- Migration: Add Missing Indexes
-- Description: Add indexes for unindexed foreign keys to improve query performance

-- Index for matches.venue_id (foreign key to venues)
CREATE INDEX IF NOT EXISTS idx_matches_venue ON matches(venue_id);

-- Index for ratings.rater_user_id (foreign key to profiles)
CREATE INDEX IF NOT EXISTS idx_ratings_rater_user ON ratings(rater_user_id);
