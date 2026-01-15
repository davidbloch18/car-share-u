import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Info } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { useRidesViewModel } from "@/viewmodels/useRidesViewModel";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";

export default function PostRide() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuthViewModel();
  const { createRide } = useRidesViewModel();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profileBitLink, setProfileBitLink] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    seats: "",
    cost: "",
    recurringFrequency: "weekly" as "daily" | "weekly",
    recurringEndDate: "",
    recurringDaysOfWeek: [] as number[], // 0 = Sunday, 6 = Saturday
  });

  useEffect(() => {
    if (session === null) navigate("/auth");
  }, [session, navigate]);

  // fetch profile phone when session is available
  useEffect(() => {
    if (!session?.user) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, bit_link")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!error && data) {
        setProfilePhone(data.phone || null);
        setProfileBitLink(data.bit_link || null);
      }
    })();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    // require linked phone and bit payment link
    if (!profilePhone || !profileBitLink) {
      setIsLoading(false);
      toast({
        title: "Profile incomplete",
        description: "You must add a phone number and a Bit payment link to your profile before posting a ride.",
        variant: "destructive",
      });
      return;
    }

    // enforce 1 month limit from today
    const today = new Date();
    const max = new Date();
    max.setMonth(max.getMonth() + 1);

    const selectedDate = new Date(formData.departureDate + "T00:00:00");
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const maxDate = new Date(max.getFullYear(), max.getMonth(), max.getDate());

    if (selectedDate < todayDate || selectedDate > maxDate) {
      setIsLoading(false);
      toast({
        title: "Invalid date",
        description: "Departure date must be within 1 month from today.",
        variant: "destructive",
      });
      return;
    }

    // Validate recurring ride settings
    if (isRecurring) {
      if (!formData.recurringEndDate) {
        toast({
          title: "Missing end date",
          description: "Please select an end date for recurring rides.",
          variant: "destructive",
        });
        return;
      }

      const endDate = new Date(formData.recurringEndDate + "T00:00:00");
      if (endDate <= selectedDate) {
        toast({
          title: "Invalid end date",
          description: "End date must be after the first ride date.",
          variant: "destructive",
        });
        return;
      }

      if (endDate > maxDate) {
        toast({
          title: "End date too far",
          description: "Recurring rides cannot extend beyond 1 month.",
          variant: "destructive",
        });
        return;
      }

      if (formData.recurringFrequency === "weekly" && formData.recurringDaysOfWeek.length === 0) {
        toast({
          title: "No days selected",
          description: "Please select at least one day of the week for weekly recurring rides.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isRecurring) {
        // Generate multiple rides based on recurrence pattern
        const rides = generateRecurringRides();
        
        let successCount = 0;
        for (const rideDate of rides) {
          const departureDateTime = new Date(
            `${rideDate.toISOString().split('T')[0]}T${formData.departureTime}`
          ).toISOString();

          const { error } = await createRide({
            driver_id: session.user.id,
            origin: formData.origin,
            destination: formData.destination,
            departure_time: departureDateTime,
            seats_total: parseInt(formData.seats),
            seats_available: parseInt(formData.seats),
            cost: parseFloat(formData.cost),
          });

          if (!error) successCount++;
        }

        setIsLoading(false);
        if (successCount > 0) {
          toast({
            title: "Recurring Rides Posted!",
            description: `Successfully created ${successCount} ride${successCount > 1 ? 's' : ''}.`,
          });
          navigate("/home");
        } else {
          toast({
            title: "Error",
            description: "Failed to create recurring rides.",
            variant: "destructive",
          });
        }
      } else {
        // Single ride
        const departureDateTime = new Date(
          `${formData.departureDate}T${formData.departureTime}`
        ).toISOString();

        const { error } = await createRide({
          driver_id: session.user.id,
          origin: formData.origin,
          destination: formData.destination,
          departure_time: departureDateTime,
          seats_total: parseInt(formData.seats),
          seats_available: parseInt(formData.seats),
          cost: parseFloat(formData.cost),
        });

        setIsLoading(false);

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ride Posted!",
            description: "Your ride has been published successfully.",
          });
          navigate("/home");
        }
      }
    } catch (err) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const generateRecurringRides = (): Date[] => {
    const rides: Date[] = [];
    const startDate = new Date(formData.departureDate + "T00:00:00");
    const endDate = new Date(formData.recurringEndDate + "T00:00:00");
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (formData.recurringFrequency === "daily") {
        rides.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (formData.recurringFrequency === "weekly") {
        const dayOfWeek = currentDate.getDay();
        if (formData.recurringDaysOfWeek.includes(dayOfWeek)) {
          rides.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return rides;
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurringDaysOfWeek: prev.recurringDaysOfWeek.includes(day)
        ? prev.recurringDaysOfWeek.filter(d => d !== day)
        : [...prev.recurringDaysOfWeek, day].sort()
    }));
  };

  if (!session) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 1);
  const maxDateStr = maxDateObj.toISOString().split("T")[0];

  const missing: string[] = [];
  if (!profilePhone) missing.push("phone number");
  if (!profileBitLink) missing.push("Bit payment link");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-primary-foreground hover:bg-primary-hover"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Post a Ride</h1>
      </header>

      <main className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Ride Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Pickup Location</Label>
                <Input
                  id="origin"
                  placeholder="e.g., Tel Aviv Central Station"
                  value={formData.origin}
                  onChange={(e) =>
                    setFormData({ ...formData, origin: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="e.g., Jerusalem University"
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) =>
                      setFormData({ ...formData, departureDate: e.target.value })
                    }
                    min={todayStr}
                    max={maxDateStr}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) =>
                      setFormData({ ...formData, departureTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Recurring Rides Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                  />
                  <Label htmlFor="recurring" className="cursor-pointer font-medium">
                    Make this a recurring ride
                  </Label>
                </div>

                {isRecurring && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>Create multiple rides automatically based on your schedule</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select
                        value={formData.recurringFrequency}
                        onValueChange={(value: "daily" | "weekly") =>
                          setFormData({ ...formData, recurringFrequency: value })
                        }
                      >
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.recurringFrequency === "weekly" && (
                      <div className="space-y-2">
                        <Label>Select Days</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                            <Button
                              key={day}
                              type="button"
                              variant={formData.recurringDaysOfWeek.includes(index) ? "default" : "outline"}
                              size="sm"
                              className="h-10 text-xs"
                              onClick={() => toggleDayOfWeek(index)}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.recurringEndDate}
                        onChange={(e) =>
                          setFormData({ ...formData, recurringEndDate: e.target.value })
                        }
                        min={formData.departureDate || todayStr}
                        max={maxDateStr}
                        required={isRecurring}
                      />
                      <p className="text-xs text-muted-foreground">
                        Rides will be created until this date (max 1 month)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seats">Available Seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    min="1"
                    max="8"
                    placeholder="1-8"
                    value={formData.seats}
                    onChange={(e) =>
                      setFormData({ ...formData, seats: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Price per Seat (₪)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-accent-foreground"
                disabled={isLoading || missing.length > 0}
              >
                {isLoading ? "Publishing..." : "Publish Ride"}
              </Button>
              {missing.length > 0 && (
                <div className="text-sm text-destructive mt-2 flex items-center gap-2">
                  <span>
                    You must add {missing.join(" and ")} to your profile before posting a ride.
                  </span>
                  <button
                    type="button"
                    className="underline text-primary-foreground"
                    onClick={() => navigate("/profile")}
                  >
                    Edit profile
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
