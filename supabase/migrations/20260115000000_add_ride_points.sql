-- Add pickup_points and dropoff_points to rides table
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS pickup_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dropoff_points JSONB DEFAULT '[]'::jsonb;

-- Add pickup_point and dropoff_point to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS pickup_point TEXT,
ADD COLUMN IF NOT EXISTS dropoff_point TEXT;
