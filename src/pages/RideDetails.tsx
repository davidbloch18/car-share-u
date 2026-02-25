import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Clock, Users, Car, CheckCircle2, Send, Edit } from "lucide-react";
import { format } from "date-fns";
import type { Session } from "@supabase/supabase-js";
import { useRidesViewModel } from "@/viewmodels/useRidesViewModel";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";
import { GenderAvatar, getGenderIcon } from "@/components/GenderAvatar";
import { notifyDriverNewPassenger, notifyPassengerBookingConfirmed } from "@/services/notificationDispatcher";

export default function RideDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuthViewModel();
  const { getRideById, getBookings, bookRide } = useRidesViewModel();
  const [ride, setRide] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [isBooked, setIsBooked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<string>("");
  const [selectedDropoff, setSelectedDropoff] = useState<string>("");

  useEffect(() => {
    if (session === null) {
      navigate("/auth");
    }
  }, [session, navigate]);

  useEffect(() => {
    if (session && id) {
      fetchRideDetails();
      checkBookingStatus();
    }
  }, [session, id]);

  const fetchRideDetails = async () => {
    const { data: rideData, error: rideError } = await getRideById(id as string);

    if (rideError) {
      toast({
        title: "שגיאה",
        description: "טעינת פרטי הנסיעה נכשלה",
        variant: "destructive",
      });
      return;
    }

    setRide(rideData);

    // Fetch passengers
    const { data: bookingsData, error: bookingsError } = await getBookings(id as string);
    if (!bookingsError) {
      setPassengers(bookingsData || []);
    }
  };

  const checkBookingStatus = async () => {
    if (!session?.user) return;

    const { data: bookingsData } = await getBookings(id as string);
    const isUserBooked = !!(bookingsData || []).find(
      (b: any) => b.passenger && b.passenger.id === session.user.id
    );
    setIsBooked(isUserBooked);
  };

  const handleJoinRide = async () => {
    if (!session?.user || !ride) return;

    if (ride.seats_available <= 0) {
      toast({
        title: "אין מקומות פנויים",
        description: "הנסיעה מלאה.",
        variant: "destructive",
      });
      return;
    }

    if (ride.driver_id === session.user.id) {
      toast({
        title: "לא ניתן להצטרף",
        description: "אי אפשר להצטרף לנסיעה של עצמך.",
        variant: "destructive",
      });
      return;
    }

    if (ride.pickup_points && ride.pickup_points.length > 0 && !selectedPickup) {
      toast({
        title: "נדרשת נקודת איסוף",
        description: "אנא בחר נקודת איסוף.",
        variant: "destructive",
      });
      return;
    }

    if (ride.dropoff_points && ride.dropoff_points.length > 0 && !selectedDropoff) {
      toast({
        title: "נדרשת נקודת הורדה",
        description: "אנא בחר נקודת הורדה.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error: bookingError } = await bookRide({
      ride_id: ride.id,
      passenger_id: session.user.id,
      currentSeats: ride.seats_available,
      pickup_point: selectedPickup || ride.origin,
      dropoff_point: selectedDropoff || ride.destination
    });

    setIsLoading(false);

    if (bookingError) {
      if ((bookingError as any).code === "23505") {
        toast({
          title: "כבר נרשמת",
          description: "כבר הצטרפת לנסיעה זו.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "שגיאה",
          description: bookingError.message || "ההזמנה נכשלה",
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "ההזמנה אושרה!",
      description: "הצטרפת בהצלחה לנסיעה.",
    });

    // Send notifications
    const passengerName = session.user.user_metadata?.first_name
      ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name || ""}`
      : session.user.email || "נוסע";

    // Notify driver about new passenger
    notifyDriverNewPassenger(
      ride.driver_id,
      passengerName,
      ride.origin,
      ride.destination,
      ride.id,
      selectedPickup || undefined,
      selectedDropoff || undefined,
    );

    // Notify passenger with booking confirmation
    const driverName = `${ride.driver.first_name} ${ride.driver.last_name}`;
    notifyPassengerBookingConfirmed(
      session.user.id,
      driverName,
      ride.origin,
      ride.destination,
      ride.id,
      ride.cost,
    );

    fetchRideDetails();
    checkBookingStatus();
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
        <h1 className="text-xl font-semibold">פרטי נסיעה</h1>
        {isDriver && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/post-ride", { state: { editRide: ride } })}
            className="text-primary-foreground hover:bg-primary-foreground/10 mr-auto"
          >
            <Edit className="h-5 w-5" />
          </Button>
        )}
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Driver Info Card */}
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarImage 
                  src={
                    ride.driver.avatar_url || 
                    getGenderIcon(ride.driver.gender)
                  } 
                />
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
                  סטודנט מאומת
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

        {/* Pickup Location */}
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 rounded-full p-2.5 mt-0.5">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">נקודת איסוף</p>
              <p className="font-semibold text-base mb-2">{ride.origin}</p>
              
              {!isDriver && !isBooked && ride.pickup_points && ride.pickup_points.length > 0 && (
                <div className="mt-2 text-sm bg-muted/40 p-3 rounded-md">
                   <p className="font-medium mb-2 text-destructive">נא לבחור נקודת איסוף *</p>
                   <RadioGroup value={selectedPickup} onValueChange={setSelectedPickup}>
                      {ride.pickup_points.map((point: string, i: number) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem value={point} id={`pickup-${i}`} />
                          <Label htmlFor={`pickup-${i}`} className="text-sm font-normal cursor-pointer">{point}</Label>
                        </div>
                      ))}
                   </RadioGroup>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Destination */}
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="bg-destructive/10 rounded-full p-2.5 mt-0.5">
              <MapPin className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">יעד</p>
              <p className="font-semibold text-base mb-2">{ride.destination}</p>

              {!isDriver && !isBooked && ride.dropoff_points && ride.dropoff_points.length > 0 && (
                <div className="mt-2 text-sm bg-muted/40 p-3 rounded-md">
                   <p className="font-medium mb-2 text-destructive">נא לבחור נקודת הורדה *</p>
                   <RadioGroup value={selectedDropoff} onValueChange={setSelectedDropoff}>
                      {ride.dropoff_points.map((point: string, i: number) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem value={point} id={`dropoff-${i}`} />
                          <Label htmlFor={`dropoff-${i}`} className="text-sm font-normal cursor-pointer">{point}</Label>
                        </div>
                      ))}
                   </RadioGroup>
                </div>
              )}
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
                <p className="text-xs text-muted-foreground mb-0.5">יציאה</p>
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
                <p className="text-xs text-muted-foreground mb-0.5">מקומות</p>
                <p className="font-semibold text-sm">{ride.seats_available} פנויים</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Vehicle Information */}
        {(ride.vehicle_model || ride.vehicle_color) && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Car className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">מידע על הרכב</h3>
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
              נוסעים מאושרים ({passengers.length})
            </h3>

            {/* Driver view: detailed list with pickup/dropoff */}
            {isDriver ? (
              <div className="space-y-3">
                {passengers.map((booking) => (
                  <div key={booking.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                    <GenderAvatar
                      avatarUrl={booking.passenger.avatar_url}
                      gender={booking.passenger.gender}
                      fallbackInitials={`${booking.passenger.first_name[0]}${booking.passenger.last_name[0]}`}
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {booking.passenger.first_name} {booking.passenger.last_name}
                        {booking.passenger.gender && (
                          <span className="text-muted-foreground mr-1">
                            {booking.passenger.gender === "male" ? " ♂" : " ♀"}
                          </span>
                        )}
                      </p>
                      {/* Pickup point */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">עולה:</span>
                        <span className="text-xs font-medium truncate">
                          {booking.pickup_point || ride.origin}
                        </span>
                      </div>
                      {/* Dropoff point */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">יורד:</span>
                        <span className="text-xs font-medium truncate">
                          {booking.dropoff_point || ride.destination}
                        </span>
                      </div>
                      {/* WhatsApp contact for driver */}
                      {booking.passenger.phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1.5 h-7 px-2 text-xs gap-1 text-[#25D366]"
                          onClick={() =>
                            window.open(
                              `https://wa.me/${booking.passenger.phone.replace(/[^0-9]/g, "")}`,
                              "_blank"
                            )
                          }
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          {booking.passenger.phone}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Passenger/public view: compact avatars */
              <div className="flex gap-3 flex-wrap">
                {passengers.map((booking) => (
                  <div key={booking.id} className="flex flex-col items-center">
                    <GenderAvatar
                      avatarUrl={booking.passenger.avatar_url}
                      gender={booking.passenger.gender}
                      fallbackInitials={`${booking.passenger.first_name[0]}${booking.passenger.last_name[0]}`}
                      className="h-12 w-12 mb-1"
                    />
                    <p className="text-xs font-medium text-center">
                      {booking.passenger.first_name} {booking.passenger.last_name[0]}.
                    </p>
                    {booking.passenger.gender && (
                      <p className="text-[10px] text-muted-foreground">
                        {booking.passenger.gender === "male" ? "♂" : "♀"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Gender summary */}
            {passengers.length > 0 && (
              <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
                <span>♂ {passengers.filter((b: any) => b.passenger.gender?.toLowerCase() === "male").length} גברים</span>
                <span>♀ {passengers.filter((b: any) => b.passenger.gender?.toLowerCase() === "female").length} נשים</span>
              </div>
            )}
          </Card>
        )}

        {/* Total Cost */}
        <Card className="p-5 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">עלות</p>
              <p className="text-2xl font-bold text-primary">₪{ride.cost}</p>
              <p className="text-xs text-muted-foreground">לנוסע</p>
            </div>
            {ride.driver.bit_link ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 hover:bg-primary/10 rounded-full"
                onClick={() => window.open(ride.driver.bit_link, "_blank")}
                title="שלם ב-Bit"
              >
                <Send className="h-8 w-8 text-primary" />
              </Button>
            ) : (
              <Send className="h-8 w-8 text-primary/50" />
            )}
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
              ? "מזמין..."
              : ride.seats_available <= 0
              ? "אין מקומות פנויים"
              : "הצטרף לנסיעה"}
          </Button>
        )}

        {isBooked && (
          <Card className="p-4 bg-primary/10 border-primary">
            <p className="text-center font-semibold text-primary">
              ✓ הזמנת מקום בנסיעה הזאת
            </p>
          </Card>
        )}

        {isDriver && (
          <Card className="p-4 bg-primary/10 border-primary">
            <p className="text-center font-semibold text-primary">
              אתה הנהג של הנסיעה הזאת
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
