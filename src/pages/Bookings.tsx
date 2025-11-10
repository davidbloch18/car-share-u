import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import type { Session } from "@supabase/supabase-js";

export default function Bookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    if (session) {
      fetchBookings();
    }
  }, [session]);

  const fetchBookings = async () => {
    if (!session?.user) return;

    setIsLoading(true);

    // Fetch my bookings as passenger
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(
        `
        *,
        ride:rides(
          *,
          driver:profiles!rides_driver_id_fkey(first_name, last_name, avatar_url)
        )
      `
      )
      .eq("passenger_id", session.user.id)
      .eq("status", "confirmed")
      .order("booking_time", { ascending: false });

    setMyBookings(bookingsData || []);

    // Fetch my rides as driver
    const { data: ridesData } = await supabase
      .from("rides")
      .select("*")
      .eq("driver_id", session.user.id)
      .order("departure_time", { ascending: false });

    setMyRides(ridesData || []);
    setIsLoading(false);
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
      </header>

      <main className="p-4">
        <Tabs defaultValue="bookings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookings">As Passenger</TabsTrigger>
            <TabsTrigger value="rides">As Driver</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading bookings...
              </div>
            ) : myBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bookings yet
              </div>
            ) : (
              myBookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/ride/${booking.ride.id}`)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {booking.ride.driver.first_name}{" "}
                        {booking.ride.driver.last_name}
                      </h3>
                      <Badge className="bg-success-light text-success border-success">
                        Confirmed
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{booking.ride.origin}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{booking.ride.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(
                          new Date(booking.ride.departure_time),
                          "MMM d, h:mm a"
                        )}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-primary">
                      ₪{booking.ride.cost}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rides" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading rides...
              </div>
            ) : myRides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rides posted yet
              </div>
            ) : (
              myRides.map((ride) => (
                <Card
                  key={ride.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/ride/${ride.id}`)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{ride.destination}</h3>
                      <Badge
                        variant={
                          ride.status === "active" ? "default" : "secondary"
                        }
                      >
                        {ride.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{ride.origin}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{ride.destination}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(ride.departure_time), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {ride.seats_available}/{ride.seats_total} available
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
