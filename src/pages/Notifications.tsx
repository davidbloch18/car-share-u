import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function Notifications() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6">
        <h1 className="text-2xl font-bold">התראות</h1>
      </header>

      <main className="p-4">
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">אין התראות עדיין</p>
          <p className="text-sm text-muted-foreground mt-2">
            נעדכן אותך על שינויים בנסיעות והזמנות
          </p>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
