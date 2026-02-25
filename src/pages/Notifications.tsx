import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Car,
  CreditCard,
  Clock,
  UserPlus,
  AlertCircle,
  X,
  Send,
} from "lucide-react";
import { useNotificationsViewModel } from "@/viewmodels/useNotificationsViewModel";
import type { AppNotification, NotificationType } from "@/services/notificationStore";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; label: string }> = {
  ride_booked:       { icon: UserPlus,    color: "text-green-600 bg-green-100",   label: "נוסע חדש" },
  booking_confirmed: { icon: Car,         color: "text-blue-600 bg-blue-100",     label: "הזמנה אושרה" },
  ride_reminder:     { icon: Clock,       color: "text-orange-600 bg-orange-100", label: "תזכורת נסיעה" },
  payment_reminder:  { icon: CreditCard,  color: "text-purple-600 bg-purple-100", label: "תזכורת תשלום" },
  ride_updated:      { icon: AlertCircle, color: "text-yellow-600 bg-yellow-100", label: "עדכון נסיעה" },
  ride_cancelled:    { icon: X,           color: "text-red-600 bg-red-100",       label: "נסיעה בוטלה" },
  new_ride_posted:   { icon: Car,         color: "text-primary bg-primary/10",    label: "נסיעה חדשה" },
  general:           { icon: Bell,        color: "text-muted-foreground bg-muted", label: "כללי" },
};

function NotificationItem({
  notification,
  onRead,
  onRemove,
  onNavigate,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
  onNavigate: (rideId: string) => void;
}) {
  const config = typeConfig[notification.type] || typeConfig.general;
  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), {
    addSuffix: true,
    locale: he,
  });

  return (
    <Card
      className={`p-4 transition-all cursor-pointer ${
        notification.read ? "opacity-70 bg-muted/30" : "bg-card shadow-md border-primary/20"
      }`}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
        if (notification.rideId) onNavigate(notification.rideId);
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 shrink-0 ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{notification.title}</span>
              {!notification.read && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {notification.body}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {config.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          </div>
          {/* Payment link for payment reminders */}
          {notification.type === "payment_reminder" && notification.meta?.bitLink && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5 text-primary border-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.open(notification.meta!.bitLink, "_blank");
              }}
            >
              <Send className="h-3 w-3" />
              שלם ב-Bit
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    permissionStatus,
    isSupported,
    requestPermission,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
  } = useNotificationsViewModel();

  const handleNavigate = (rideId: string) => {
    navigate(`/ride/${rideId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">התראות</h1>
            {unreadCount > 0 && (
              <p className="text-sm opacity-80 mt-1">{unreadCount} לא נקראו</p>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-4 w-4" />
                  <span className="text-xs">סמן הכל</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-xs">נקה</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Push notification permission banner */}
        {isSupported && permissionStatus !== "granted" && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <BellRing className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">הפעל התראות</p>
                <p className="text-xs text-muted-foreground mt-1">
                  קבל התראות על נוסעים חדשים, תזכורות נסיעה ותשלומים גם כשהאפליקציה סגורה
                </p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={requestPermission}
                >
                  {permissionStatus === "denied" ? "ההתראות חסומות - שנה בהגדרות" : "אפשר התראות"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">אין התראות עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">
              נעדכן אותך על שינויים בנסיעות, הזמנות ותזכורות
            </p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={markRead}
              onRemove={removeNotification}
              onNavigate={handleNavigate}
            />
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
