-- Function to atomically decrement available seats
CREATE OR REPLACE FUNCTION decrement_seats(ride_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rides
  SET seats_available = seats_available - 1
  WHERE id = ride_id_param
  AND seats_available > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No seats available or ride not found';
  END IF;
END;
$$;
