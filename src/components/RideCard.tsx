import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface RideCardProps {
  ride: {
    id: string;
    driver_id: string;
    origin: string;
    destination: string;
    departure_time: string;
    seats_available: number;
    cost: number;
    driver: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
      rating_score: number;
      rating_count: number;
      is_verified: boolean;
    };
  };
}

export function RideCard({ ride }: RideCardProps) {
  const navigate = useNavigate();
  const initials = `${ride.driver.first_name[0]}${ride.driver.last_name[0]}`;

  const handleCardClick = () => navigate(`/ride/${ride.id}`);
  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/ride/${ride.id}`);
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={ride.driver.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {ride.driver.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">
                {ride.driver.first_name} {ride.driver.last_name}
              </h3>
              {ride.driver.is_verified && (
                <Badge className="mt-0.5 bg-primary/10 text-primary border-0 text-xs px-2 py-0">
                  Verified Student
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">₪{ride.cost}</p>
            <p className="text-xs text-muted-foreground">per seat</p>
          </div>
        </div>

        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">
              {ride.origin} - {ride.destination}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{format(new Date(ride.departure_time), "'Today', h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span className="font-medium">{ride.seats_available} seats left</span>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-[hsl(14,100%,57%)] hover:bg-[hsl(14,100%,50%)] text-white font-semibold h-11 text-base rounded-lg"
          onClick={handleJoinClick}
        >
          Join Ride
        </Button>
      </CardContent>
    </Card>
  );
}
