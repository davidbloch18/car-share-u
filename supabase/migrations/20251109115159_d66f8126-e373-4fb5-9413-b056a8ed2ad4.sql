-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  rating_score FLOAT DEFAULT 0 NOT NULL,
  rating_count INTEGER DEFAULT 0 NOT NULL,
  bit_link TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  seats_total INTEGER NOT NULL CHECK (seats_total > 0),
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  cost FLOAT NOT NULL CHECK (cost >= 0),
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'canceled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT DEFAULT 'confirmed' NOT NULL CHECK (status IN ('confirmed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(ride_id, passenger_id)
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(ride_id, rater_id, rated_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Rides policies
CREATE POLICY "Anyone can view active rides"
  ON public.rides FOR SELECT
  TO authenticated
  USING (status = 'active' OR driver_id = auth.uid());

CREATE POLICY "Drivers can create rides"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own rides"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own rides"
  ON public.rides FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- Bookings policies
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = passenger_id OR auth.uid() IN (
    SELECT driver_id FROM public.rides WHERE id = ride_id
  ));

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Users can cancel own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = passenger_id);

-- Ratings policies
CREATE POLICY "Users can view all ratings"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create ratings"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  email_domain TEXT;
BEGIN
  user_email := NEW.email;
  email_domain := split_part(user_email, '@', 2);
  
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    is_verified
  ) VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    email_domain = 'univ.ac.il'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to update user rating after new rating
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    rating_score = (
      SELECT AVG(score)::FLOAT
      FROM public.ratings
      WHERE rated_user_id = NEW.rated_user_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.ratings
      WHERE rated_user_id = NEW.rated_user_id
    )
  WHERE id = NEW.rated_user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update rating after new rating
CREATE TRIGGER on_rating_created
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_rating();