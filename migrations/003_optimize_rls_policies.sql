-- Migration: Optimize RLS Policies for Performance
-- Description: Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create optimized policies
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- MATCHES TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Organizers can update their matches" ON matches;
DROP POLICY IF EXISTS "Organizers can delete their matches" ON matches;

-- Create optimized policies
CREATE POLICY "Users can create matches" 
ON matches FOR INSERT 
WITH CHECK ((select auth.uid()) = organizer_id);

CREATE POLICY "Organizers can update their matches" 
ON matches FOR UPDATE 
USING ((select auth.uid()) = organizer_id);

CREATE POLICY "Organizers can delete their matches" 
ON matches FOR DELETE 
USING ((select auth.uid()) = organizer_id);

-- ============================================
-- MATCH_PARTICIPANTS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can join matches" ON match_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON match_participants;
DROP POLICY IF EXISTS "Users can leave matches" ON match_participants;

-- Create optimized policies
CREATE POLICY "Users can join matches" 
ON match_participants FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their participation" 
ON match_participants FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave matches" 
ON match_participants FOR DELETE 
USING ((select auth.uid()) = user_id);

-- ============================================
-- RATINGS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Ratings viewable by involved users" ON ratings;
DROP POLICY IF EXISTS "Users can rate others" ON ratings;

-- Create optimized policies
CREATE POLICY "Ratings viewable by involved users" 
ON ratings FOR SELECT 
USING ((select auth.uid()) = rated_user_id OR (select auth.uid()) = rater_user_id);

CREATE POLICY "Users can rate others" 
ON ratings FOR INSERT 
WITH CHECK ((select auth.uid()) = rater_user_id);
