import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, Users, Car, CheckCircle2, Send } from "lucide-react";
import { format } from "date-fns";
import type { Session } from "@supabase/supabase-js";

export default function RideDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [ride, setRide] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [isBooked, setIsBooked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) navigate("/auth");
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session && id) {
      fetchRideDetails();
      checkBookingStatus();
    }
  }, [session, id]);

  const fetchRideDetails = async () => {
    const { data: rideData, error: rideError } = await supabase
      .from("rides")
      .select(
        `
        *,
        driver:profiles!rides_driver_id_fkey(*)
      `
      )
      .eq("id", id)
      .single();

    if (rideError) {
      toast({
        title: "Error",
        description: "Failed to load ride details",
        variant: "destructive",
      });
      return;
    }

    setRide(rideData);

    // Fetch passengers
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(
        `
        *,
        passenger:profiles!bookings_passenger_id_fkey(*)
      `
      )
      .eq("ride_id", id)
      .eq("status", "confirmed");

    setPassengers(bookingsData || []);
  };

  const checkBookingStatus = async () => {
    if (!session?.user) return;

    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("ride_id", id)
      .eq("passenger_id", session.user.id)
      .eq("status", "confirmed")
      .maybeSingle();

    setIsBooked(!!data);
  };

  const handleJoinRide = async () => {
    if (!session?.user || !ride) return;

    if (ride.seats_available <= 0) {
      toast({
        title: "No Seats Available",
        description: "This ride is fully booked.",
        variant: "destructive",
      });
      return;
    }

    if (ride.driver_id === session.user.id) {
      toast({
        title: "Cannot Join",
        description: "You cannot join your own ride.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Insert booking
    const { error: bookingError } = await supabase.from("bookings").insert({
      ride_id: ride.id,
      passenger_id: session.user.id,
      status: "confirmed",
    });

    if (bookingError) {
      if (bookingError.code === "23505") {
        toast({
          title: "Already Booked",
          description: "You have already joined this ride.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: bookingError.message,
          variant: "destructive",
        });
      }
      setIsLoading(false);
      return;
    }

    // Update seats
    const { error: updateError } = await supabase
      .from("rides")
      .update({ seats_available: ride.seats_available - 1 })
      .eq("id", ride.id);

    setIsLoading(false);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update ride",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Booking Confirmed!",
        description: "You have successfully joined this ride.",
      });
      fetchRideDetails();
      checkBookingStatus();
    }
  };

  if (!session || !ride) return null;

  const isDriver = session.user.id === ride.driver_id;
  const initials = `${ride.driver.first_name[0]}${ride.driver.last_name[0]}`;

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Ride Details</h1>
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Driver Info Card */}
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarImage src={ride.driver.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {ride.driver.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">
                {ride.driver.first_name} {ride.driver.last_name}
              </h2>
              {ride.driver.is_verified && (
                <Badge className="mt-0.5 bg-primary/10 text-primary border-0 text-xs">
                  Verified Student
                </Badge>
              )}
            </div>
          </div>

          {/* WhatsApp Contact */}
          {ride.driver.phone && !isDriver && (
            <Button
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2"
              onClick={() => window.open(`https://wa.me/${ride.driver.phone.replace(/[^0-9]/g, '')}`, "_blank")}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {ride.driver.phone}
            </Button>
          )}
        </Card>

        {/* Pickup Point */}
        {ride.pickup_point && (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2.5 mt-0.5">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Pickup Point</p>
                <p className="font-semibold text-base mb-1">{ride.pickup_point}</p>
                {ride.pickup_description && (
                  <p className="text-sm text-muted-foreground">{ride.pickup_description}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Destination */}
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="bg-destructive/10 rounded-full p-2.5 mt-0.5">
              <MapPin className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Destination</p>
              <p className="font-semibold text-base">{ride.destination}</p>
            </div>
          </div>
        </Card>

        {/* Departure & Seats */}
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted rounded-full p-2 mt-0.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Departure</p>
                <p className="font-semibold text-sm">
                  {format(new Date(ride.departure_time), "MMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(ride.departure_time), "h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-muted rounded-full p-2 mt-0.5">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Seats</p>
                <p className="font-semibold text-sm">{ride.seats_available} available</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Vehicle Information */}
        {(ride.vehicle_model || ride.vehicle_color) && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Car className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Vehicle Information</h3>
            </div>
            <p className="text-sm">
              {ride.vehicle_model && ride.vehicle_color
                ? `${ride.vehicle_model} - ${ride.vehicle_color}`
                : ride.vehicle_model || ride.vehicle_color}
            </p>
          </Card>
        )}

        {/* Confirmed Passengers */}
        {passengers.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold mb-3 text-sm text-primary">
              Confirmed Passengers ({passengers.length})
            </h3>
            <div className="flex gap-3">
              {passengers.map((booking) => (
                <div key={booking.id} className="flex flex-col items-center">
                  <Avatar className="h-12 w-12 mb-1">
                    <AvatarImage src={booking.passenger.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {booking.passenger.first_name[0]}
                      {booking.passenger.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium text-center">
                    {booking.passenger.first_name} {booking.passenger.last_name[0]}.
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Total Cost */}
        <Card className="p-5 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-primary">₪{ride.cost}</p>
              <p className="text-xs text-muted-foreground">per passenger</p>
            </div>
            <Send className="h-8 w-8 text-primary" />
          </div>
        </Card>

        {/* Action Button */}
        {!isDriver && !isBooked && (
          <Button
            className="w-full bg-[hsl(14,100%,57%)] hover:bg-[hsl(14,100%,50%)] text-white text-base h-12 rounded-lg font-semibold"
            onClick={handleJoinRide}
            disabled={isLoading || ride.seats_available <= 0}
          >
            {isLoading
              ? "Booking..."
              : ride.seats_available <= 0
              ? "Fully Booked"
              : "Join This Ride"}
          </Button>
        )}

        {isBooked && (
          <Card className="p-4 bg-primary/10 border-primary">
            <p className="text-center font-semibold text-primary">
              ✓ You have booked this ride
            </p>
          </Card>
        )}

        {isDriver && (
          <Card className="p-4 bg-primary/10 border-primary">
            <p className="text-center font-semibold text-primary">
              You are the driver of this ride
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
