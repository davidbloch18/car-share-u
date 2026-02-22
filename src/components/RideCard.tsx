import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { getGenderIcon } from "@/components/GenderAvatar";

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
    pickup_points?: string[];
    dropoff_points?: string[];
    driver: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
      gender?: string;
      rating_score: number;
      rating_count: number;
      is_verified: boolean;
    };
  };
}

export function RideCard({ ride }: RideCardProps) {
  const navigate = useNavigate();
  const initials = `${ride.driver.first_name[0]}${ride.driver.last_name[0]}`;

  const getAvatarUrl = () => {
    if (ride.driver.avatar_url) return ride.driver.avatar_url;
    return getGenderIcon(ride.driver.gender);
  };

  const handleCardClick = () => navigate(`/ride/${ride.id}`);
  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/ride/${ride.id}`);
  };

  const date = new Date(ride.departure_time);
  
  // Changed from relative "Today" format to explicit "Day, Date • Time" format
  // This avoids timezone confusion for recurring/future rides
  const formattedDate = format(date, "EEE, MMM d • h:mm a");

  return (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={getAvatarUrl()} />
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
                  סטודנט מאומת
                </Badge>
              )}
            </div>
          </div>
          <div className="text-left">
            <div className="text-xl font-bold text-primary">₪{ride.cost}</div>
            <div className="text-xs text-muted-foreground">למושב</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Clock className="h-4 w-4" />
          <span>{formattedDate}</span>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span>{ride.origin}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span>{ride.destination}</span>
            </div>
          </div>
          {((ride.pickup_points && ride.pickup_points.length > 0) || (ride.dropoff_points && ride.dropoff_points.length > 0)) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-6 flex-wrap">
              {ride.pickup_points && ride.pickup_points.length > 0 && (
                <>
                  {ride.pickup_points.map((point, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      {idx > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                      <span>{point}</span>
                    </span>
                  ))}
                </>
              )}
              {ride.pickup_points && ride.pickup_points.length > 0 && ride.dropoff_points && ride.dropoff_points.length > 0 && (
                <ArrowRight className="h-2.5 w-2.5" />
              )}
              {ride.dropoff_points && ride.dropoff_points.length > 0 && (
                <>
                  {ride.dropoff_points.map((point, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      {idx > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                      <span>{point}</span>
                    </span>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 shrink-0" />
            <span className="font-medium">{ride.seats_available} מקומות פנויים</span>
          </div>
        </div>

        <Button
          className="w-full bg-[hsl(14,100%,57%)] hover:bg-[hsl(14,100%,50%)] text-white font-semibold h-11 text-base rounded-lg"
          onClick={handleJoinClick}
        >
          הצטרף לנסיעה

        </Button>
      </CardContent>
    </Card>
  );
}
