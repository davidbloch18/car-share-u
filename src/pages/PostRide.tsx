import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Info, Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@supabase/supabase-js";
import { useRidesViewModel } from "@/viewmodels/useRidesViewModel";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollTimePicker } from "@/components/ui/scroll-time-picker";
import { SeatPicker } from "@/components/ui/seat-picker";
import { PricePicker } from "@/components/ui/price-picker";
import { notifyRideUpdated } from "@/services/notificationDispatcher";

export default function PostRide() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuthViewModel();
  const { createRide, updateRide } = useRidesViewModel();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profileBitLink, setProfileBitLink] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [pickupPoints, setPickupPoints] = useState<string[]>([]);
  const [dropoffPoints, setDropoffPoints] = useState<string[]>([]);
  const [newPickupPoint, setNewPickupPoint] = useState("");
  const [newDropoffPoint, setNewDropoffPoint] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [rideId, setRideId] = useState<string | null>(null);

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
    // Check if we are editing (from Edit button in RideDetails) or Reposting (from Bookings)
    if (location.state?.editRide) {
      const ride = location.state.editRide;
      setIsEditMode(true);
      setRideId(ride.id);
      
      const date = new Date(ride.departure_time);
      setFormData(prev => ({
        ...prev,
        origin: ride.origin,
        destination: ride.destination,
        seats: ride.seats_total.toString(),
        cost: ride.cost.toString(),
        departureDate: date.toISOString().split('T')[0],
        departureTime: date.toTimeString().split(' ')[0].substring(0, 5)
      }));
      if (ride.pickup_points && Array.isArray(ride.pickup_points)) {
        setPickupPoints(ride.pickup_points);
      }
      if (ride.dropoff_points && Array.isArray(ride.dropoff_points)) {
        setDropoffPoints(ride.dropoff_points);
      }
    } else if (location.state?.repostRide) {
      const ride = location.state.repostRide;
      setFormData(prev => ({
        ...prev,
        origin: ride.origin,
        destination: ride.destination,
        seats: ride.seats_total.toString(),
        cost: ride.cost.toString(),
      }));
      if (ride.pickup_points && Array.isArray(ride.pickup_points)) {
        setPickupPoints(ride.pickup_points);
      }
      if (ride.dropoff_points && Array.isArray(ride.dropoff_points)) {
        setDropoffPoints(ride.dropoff_points);
      }
    }
  }, [location.state]);

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
        title: "הפרופיל לא הושלם",
        description: "יש להוסיף מספר טלפון וקישור תשלום Bit לפרופיל לפני פרסום נסיעה.",
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
        title: "תאריך לא תקין",
        description: "תאריך היציאה חייב להיות תוך חודש מהיום.",
        variant: "destructive",
      });
      return;
    }

    // Validate recurring ride settings
    if (isRecurring) {
      if (!formData.recurringEndDate) {
        toast({
          title: "חסר תאריך סיום",
          description: "נא לבחור תאריך סיום לנסיעות חוזרות.",
          variant: "destructive",
        });
        return;
      }

      const endDate = new Date(formData.recurringEndDate + "T00:00:00");
      if (endDate <= selectedDate) {
        toast({
          title: "תאריך סיום לא תקין",
          description: "תאריך הסיום חייב להיות אחרי תאריך הנסיעה הראשונה.",
          variant: "destructive",
        });
        return;
      }

      if (endDate > maxDate) {
        toast({
          title: "תאריך סיום רחוק מדי",
          description: "נסיעות חוזרות לא יכולות לחרוג מעבר לחודש אחד.",
          variant: "destructive",
        });
        return;
      }

      if (formData.recurringFrequency === "weekly" && formData.recurringDaysOfWeek.length === 0) {
        toast({
          title: "לא נבחרו ימים",
          description: "יש לבחור לפחות יום אחד בשבוע לנסיעות שבועיות.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    // Include any pending points locally in the submission
    const finalPickupPoints = newPickupPoint.trim() ? [...pickupPoints, newPickupPoint.trim()] : pickupPoints;
    const finalDropoffPoints = newDropoffPoint.trim() ? [...dropoffPoints, newDropoffPoint.trim()] : dropoffPoints;

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
            pickup_points: finalPickupPoints,
            dropoff_points: finalDropoffPoints,
          });

          if (!error) successCount++;
        }

        setIsLoading(false);
        if (successCount > 0) {
          toast({
            title: "נסיעות חוזרות פורסמו!",
            description: `נוצרו ${successCount} נסיעות בהצלחה.`,
          });
          navigate("/home");
        } else {
          toast({
            title: "שגיאה",
            description: "יצירת נסיעות חוזרות נכשלה.",
            variant: "destructive",
          });
        }
      } else {
        // Single ride OR Update
        const departureDateTime = new Date(
          `${formData.departureDate}T${formData.departureTime}`
        ).toISOString();

        let error;
        
        if (isEditMode && rideId) {
           const result = await updateRide(rideId, {
            origin: formData.origin,
            destination: formData.destination,
            departure_time: departureDateTime,
            seats_total: parseInt(formData.seats),
            cost: parseFloat(formData.cost),
            pickup_points: finalPickupPoints,
            dropoff_points: finalDropoffPoints,
           });
           error = result.error;
        } else {
           const result = await createRide({
            driver_id: session.user.id,
            origin: formData.origin,
            destination: formData.destination,
            departure_time: departureDateTime,
            seats_total: parseInt(formData.seats),
            seats_available: parseInt(formData.seats),
            cost: parseFloat(formData.cost),
            pickup_points: finalPickupPoints,
            dropoff_points: finalDropoffPoints,
           });
           error = result.error;
        }

        setIsLoading(false);

        if (error) {
          toast({
            title: "שגיאה",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: isEditMode ? "הנסיעה עודכנה!" : "הנסיעה פורסמה!",
            description: isEditMode ? "הנסיעה שלך עודכנה." : "הנסיעה שלך פורסמה בהצלחה.",
          });

          // Notify passengers if ride was updated
          if (isEditMode && rideId) {
            (async () => {
              const { data: bookings } = await supabase
                .from("bookings")
                .select("passenger_id")
                .eq("ride_id", rideId)
                .eq("status", "confirmed");
              if (bookings && bookings.length > 0) {
                const passengerIds = bookings.map((b: any) => b.passenger_id);
                notifyRideUpdated(
                  passengerIds,
                  formData.origin,
                  formData.destination,
                  rideId,
                  "הנהג עדכן את פרטי הנסיעה",
                );
              }
            })();
          }

          if (isEditMode) {
            navigate(`/ride/${rideId}`);
          } else {
            navigate("/home");
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בלתי צפויה.",
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
  if (!profilePhone) missing.push("מספר טלפון");
  if (!profileBitLink) missing.push("קישור תשלום Bit");

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
        <h1 className="text-xl font-bold">{isEditMode ? "עריכת נסיעה" : "פרסום נסיעה"}</h1>
      </header>

      <main className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>פרטי הנסיעה</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="origin">מאיפה (אזור כללי)</Label>
                <Input
                  id="origin"
                  placeholder="למשל: תל אביב"
                  value={formData.origin}
                  onChange={(e) =>
                    setFormData({ ...formData, origin: e.target.value })
                  }
                  required
                />
              </div>

              {/* Specific Pickup Points */}
              <div className="space-y-2">
                <Label>נקודות איסוף ספציפיות (אופציונלי)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="הוסף נקודת איסוף ספציפית..."
                    value={newPickupPoint}
                    onChange={(e) => setNewPickupPoint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPickupPoint.trim()) {
                          setPickupPoints([...pickupPoints, newPickupPoint.trim()]);
                          setNewPickupPoint("");
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (newPickupPoint.trim()) {
                        setPickupPoints([...pickupPoints, newPickupPoint.trim()]);
                        setNewPickupPoint("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {pickupPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pickupPoints.map((point, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 pl-1">
                        <span className="ml-1">{point}</span>
                        <div className="flex items-center gap-0.5">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPoints = [...pickupPoints];
                                [newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]];
                                setPickupPoints(newPoints);
                              }}
                              className="hover:bg-secondary-foreground/10 rounded p-0.5"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                          )}
                          {index < pickupPoints.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPoints = [...pickupPoints];
                                [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
                                setPickupPoints(newPoints);
                              }}
                              className="hover:bg-secondary-foreground/10 rounded p-0.5"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPickupPoints(pickupPoints.filter((_, i) => i !== index))}
                            className="hover:bg-secondary-foreground/10 rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">לאיפה (אזור כללי)</Label>
                <Input
                  id="destination"
                  placeholder="למשל: ירושלים"
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  required
                />
              </div>

              {/* Specific Dropoff Points */}
              <div className="space-y-2">
                <Label>נקודות הורדה ספציפיות (אופציונלי)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="הוסף נקודת הורדה ספציפית..."
                    value={newDropoffPoint}
                    onChange={(e) => setNewDropoffPoint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newDropoffPoint.trim()) {
                          setDropoffPoints([...dropoffPoints, newDropoffPoint.trim()]);
                          setNewDropoffPoint("");
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (newDropoffPoint.trim()) {
                        setDropoffPoints([...dropoffPoints, newDropoffPoint.trim()]);
                        setNewDropoffPoint("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {dropoffPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dropoffPoints.map((point, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 pl-1">
                        <span className="ml-1">{point}</span>
                        <div className="flex items-center gap-0.5">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPoints = [...dropoffPoints];
                                [newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]];
                                setDropoffPoints(newPoints);
                              }}
                              className="hover:bg-secondary-foreground/10 rounded p-0.5"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                          )}
                          {index < dropoffPoints.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPoints = [...dropoffPoints];
                                [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
                                setDropoffPoints(newPoints);
                              }}
                              className="hover:bg-secondary-foreground/10 rounded p-0.5"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDropoffPoints(dropoffPoints.filter((_, i) => i !== index))}
                            className="hover:bg-secondary-foreground/10 rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">תאריך</Label>
                  <DatePicker
                    value={formData.departureDate}
                    onChange={(val) =>
                      setFormData({ ...formData, departureDate: val })
                    }
                    min={todayStr}
                    max={maxDateStr}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">שעה</Label>
                  <ScrollTimePicker
                    value={formData.departureTime}
                    onChange={(val) =>
                      setFormData({ ...formData, departureTime: val })
                    }
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
                    הפוך לנסיעה חוזרת
                  </Label>
                </div>

                {isRecurring && (
                  <div className="space-y-4 pr-6 border-r-2 border-primary/20">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>צור מספר נסיעות אוטומטית לפי לוח הזמנים שלך</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="frequency">תדירות</Label>
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
                          <SelectItem value="daily">יומי</SelectItem>
                          <SelectItem value="weekly">שבועי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.recurringFrequency === "weekly" && (
                      <div className="space-y-2">
                        <Label>בחר ימים</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((day, index) => (
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
                      <Label htmlFor="endDate">תאריך סיום</Label>
                      <DatePicker
                        value={formData.recurringEndDate}
                        onChange={(val) =>
                          setFormData({ ...formData, recurringEndDate: val })
                        }
                        min={formData.departureDate || todayStr}
                        max={maxDateStr}
                      />
                      <p className="text-xs text-muted-foreground">
                        נסיעות ייוצרו עד תאריך זה (מקסימום חודש)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>מקומות פנויים</Label>
                  <SeatPicker
                    value={formData.seats}
                    onChange={(val) =>
                      setFormData({ ...formData, seats: val })
                    }
                    min={1}
                    max={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מחיר למקום (₪)</Label>
                  <PricePicker
                    value={formData.cost}
                    onChange={(val) =>
                      setFormData({ ...formData, cost: val })
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-accent-foreground"
                disabled={isLoading || missing.length > 0}
              >
                {isLoading ? "מפרסם..." : "פרסם נסיעה"}
              </Button>
              {missing.length > 0 && (
                <div className="text-sm text-destructive mt-2 flex items-center gap-2">
                  <span>
                    יש להוסיף {missing.join(" ו")} לפרופיל לפני פרסום נסיעה.
                  </span>
                  <button
                    type="button"
                    className="underline text-primary-foreground"
                    onClick={() => navigate("/profile")}
                  >
                    ערוך פרופיל
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
