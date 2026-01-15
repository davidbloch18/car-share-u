import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRidesViewModel() {
  const [rides, setRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        driver:profiles!rides_driver_id_fkey(
          first_name,
          last_name,
          avatar_url,
          rating_score,
          rating_count,
          gender
        )
      `
      )
      .eq("status", "active")
      .gte("departure_time", new Date().toISOString())
      .order("departure_time", { ascending: true });

    if (error) {
      setRides([]);
      setIsLoading(false);
      return { error };
    }

    setRides(data || []);
    setIsLoading(false);
    return { data };
  }, []);

  const getRideById = useCallback(async (id: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        driver:profiles!rides_driver_id_fkey(
          first_name,
          last_name,
          avatar_url,
          rating_score,
          rating_count,
          gender,
          phone,
          bit_link
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    setIsLoading(false);
    return { data, error };
  }, []);

  const createRide = useCallback(async (payload: {
    driver_id: string;
    origin: string;
    destination: string;
    departure_time: string;
    seats_total: number;
    seats_available: number;
    cost: number;
    pickup_points?: string[];
    dropoff_points?: string[];
  }) => {
    setIsLoading(true);
    const { error } = await supabase.from("rides").insert(payload);
    setIsLoading(false);
    return { error };
  }, []);

  const bookRide = useCallback(async (payload: { ride_id: string; passenger_id: string; currentSeats?: number; pickup_point?: string; dropoff_point?: string }) => {
    setIsLoading(true);
    const { error: bookingError } = await supabase.from("bookings").insert({
      ride_id: payload.ride_id,
      passenger_id: payload.passenger_id,
      status: "confirmed",
      pickup_point: payload.pickup_point,
      dropoff_point: payload.dropoff_point
    });

    if (bookingError) {
      setIsLoading(false);
      return { error: bookingError };
    }

    // Decrement seats atomically using a safe update (ensure seats_available > 0)
    const { error: updateError } = await (supabase as any).rpc("decrement_seats", { ride_id_param: payload.ride_id });

    // If rpc not present (older DB or network issue), ignore the error if fallback works, 
    // OR if the error is "function not found" fallback to simple update.
    // However, rpc is safer.
    if (updateError && typeof payload.currentSeats === "number") {
      console.warn("RPC failed, falling back to client-side decrement:", updateError);
      const { error: fallbackError } = await supabase
        .from("rides")
        .update({ seats_available: payload.currentSeats - 1 })
        .eq("id", payload.ride_id);
        
      setIsLoading(false);
      return { error: fallbackError };
    }

    setIsLoading(false);
    return { error: updateError };
  }, []);

  const updateRide = useCallback(async (rideId: string, payload: {
    origin?: string;
    destination?: string;
    departure_time?: string;
    seats_total?: number;
    seats_available?: number;
    cost?: number;
    pickup_points?: string[];
    dropoff_points?: string[];
  }) => {
    setIsLoading(true);
    const { error } = await supabase
      .from("rides")
      .update(payload)
      .eq("id", rideId);
    setIsLoading(false);
    return { error };
  }, []);

  const getBookings = useCallback(async (ride_id: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        passenger:profiles!bookings_passenger_id_fkey(*)
      `)
      .eq("ride_id", ride_id)
      .eq("status", "confirmed");

    setIsLoading(false);
    return { data, error };
  }, []);

  return {
    rides,
    isLoading,
    fetchRides,
    getRideById,
    createRide,
    updateRide,
    bookRide,
    getBookings,
  } as const;
}
