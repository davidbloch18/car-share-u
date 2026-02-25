import { Home, Calendar, Plus, Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotificationsViewModel } from "@/viewmodels/useNotificationsViewModel";

export function BottomNav() {
  const location = useLocation();
  const { unreadCount } = useNotificationsViewModel();

  const navItems = [
    { icon: Home, label: "נסיעות", path: "/home" },
    { icon: Calendar, label: "הזמנות", path: "/bookings" },
    { icon: Plus, label: "פרסם", path: "/post-ride", isAction: true },
    { icon: Bell, label: "התראות", path: "/notifications", badge: unreadCount },
    { icon: User, label: "פרופיל", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.isAction) {
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-full bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg"
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
