-- Add pickup_points and dropoff_points to rides table
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS pickup_points TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS dropoff_points TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add pickup_point and dropoff_point to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS pickup_point TEXT,
ADD COLUMN IF NOT EXISTS dropoff_point TEXT;

-- Add gender to profiles (if not already present)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'other';

-- Ensure phone and bit_link columns exist (they should, but just in case)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bit_link TEXT;
