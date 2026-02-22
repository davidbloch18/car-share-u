import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { RideCard } from "@/components/RideCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import { useRidesViewModel } from "@/viewmodels/useRidesViewModel";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuthViewModel();
  const { rides, isLoading, fetchRides } = useRidesViewModel();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("today");

  useEffect(() => {
    if (session === null) {
      navigate("/auth");
    }
  }, [session, navigate]);

  useEffect(() => {
    if (session) {
      fetchRides();
    }
  }, [session, fetchRides]);

  const handleManualRefresh = () => {
    fetchRides();
    toast({
      description: "הנסיעות רועננו",
      duration: 1500,
    });
  };

  const getFilteredRides = () => {
    let filtered = rides;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (activeFilter) {
      case "today":
        filtered = filtered.filter((ride) => {
          const rideDate = new Date(ride.departure_time);
          return rideDate >= today && rideDate < tomorrow;
        });
        break;
      case "tomorrow":
        filtered = filtered.filter((ride) => {
          const rideDate = new Date(ride.departure_time);
          const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          return rideDate >= tomorrow && rideDate < dayAfterTomorrow;
        });
        break;
      case "week":
        filtered = filtered.filter((ride) => {
          const rideDate = new Date(ride.departure_time);
          return rideDate >= today && rideDate < weekEnd;
        });
        break;
      case "lowcost":
        filtered = [...filtered].sort((a, b) => a.cost - b.cost);
        break;
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (ride) =>
          ride.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ride.origin.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredRides = getFilteredRides();

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">נסיעות זמינות</h1>
            <p className="text-primary-foreground/90 text-sm">
              מצא את הנסיעה הבאה שלך
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="לאן אתה נוסע?"
              className="pr-10 bg-background text-foreground border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            size="icon"
            onClick={handleManualRefresh}
            title="רענן נסיעות"
            className="shrink-0 bg-background text-foreground hover:bg-background/90"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Filter Buttons */}
      <div className="px-4 -mt-6 mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={activeFilter === "today" ? "default" : "secondary"}
          className="rounded-full whitespace-nowrap"
          onClick={() => setActiveFilter("today")}
        >
          היום
        </Button>
        <Button
          variant={activeFilter === "tomorrow" ? "default" : "secondary"}
          className="rounded-full whitespace-nowrap"
          onClick={() => setActiveFilter("tomorrow")}
        >
          מחר
        </Button>
        <Button
          variant={activeFilter === "week" ? "default" : "secondary"}
          className="rounded-full whitespace-nowrap"
          onClick={() => setActiveFilter("week")}
        >
          השבוע
        </Button>
        <Button
          variant={activeFilter === "lowcost" ? "default" : "secondary"}
          className="rounded-full whitespace-nowrap"
          onClick={() => setActiveFilter("lowcost")}
        >
          מחיר נמוך
        </Button>
      </div>

      {/* Rides List */}
      <main className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            טוען נסיעות...
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? "לא נמצאו נסיעות לחיפוש שלך"
              : "אין נסיעות זמינות כרגע"}
          </div>
        ) : (
          filteredRides.map((ride) => <RideCard key={ride.id} ride={ride} />)
        )}
      </main>

      <BottomNav />
    </div>
  );
}
