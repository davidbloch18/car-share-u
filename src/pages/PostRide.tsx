import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

export default function PostRide() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profileBitLink, setProfileBitLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    seats: "",
    cost: "",
  });

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
    // normalize times for comparison (compare date portion only)
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

    setIsLoading(true);

    const departureDateTime = new Date(
      `${formData.departureDate}T${formData.departureTime}`
    ).toISOString();

    const { error } = await supabase.from("rides").insert({
      driver_id: session.user.id,
      origin: formData.origin,
      destination: formData.destination,
      departure_time: departureDateTime,
      seats_total: parseInt(formData.seats),
      seats_available: parseInt(formData.seats),
      cost: parseFloat(formData.cost),
      status: "active",
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
