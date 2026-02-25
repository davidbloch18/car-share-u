/**
 * Smart Notification Scheduler
 * Schedules time-based notifications:
 *   - 30 min before ride: remind driver about ride plans & passengers
 *   - 15 min after ride: remind passengers to pay the driver
 * 
 * Uses setTimeout for scheduling within the browser session,
 * and persists scheduled ride IDs in localStorage so we don't re-schedule.
 */

import { supabase } from "@/integrations/supabase/client";
import { notificationStore } from "./notificationStore";
import { notificationService } from "./notificationService";

const SCHEDULED_KEY = "rideshare_scheduled_notifications";
const CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

interface ScheduledEntry {
  rideId: string;
  type: "ride_reminder" | "payment_reminder";
  fireAt: string; // ISO timestamp
  userId: string;
}

class NotificationScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;

  /**
   * Start the scheduler for a given user.
   * Fetches upcoming rides and schedules notifications.
   */
  async start(userId: string): Promise<void> {
    if (!userId || userId.length < 10) return; // guard against empty/invalid id
    this.userId = userId;
    await this.scheduleUpcomingRides();

    // Periodically check for new rides to schedule
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.scheduleUpcomingRides();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop the scheduler and clear all timers
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.userId = null;
  }

  private getScheduled(): ScheduledEntry[] {
    try {
      const raw = localStorage.getItem(SCHEDULED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setScheduled(entries: ScheduledEntry[]): void {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(entries));
  }

  private isAlreadyScheduled(rideId: string, type: string): boolean {
    return this.getScheduled().some((e) => e.rideId === rideId && e.type === type);
  }

  private markScheduled(entry: ScheduledEntry): void {
    const all = this.getScheduled();
    all.push(entry);
    this.setScheduled(all);
  }

  private removeScheduled(rideId: string, type: string): void {
    const all = this.getScheduled().filter((e) => !(e.rideId === rideId && e.type === type));
    this.setScheduled(all);
  }

  /**
   * Fetch rides for this user and schedule reminders
   */
  private async scheduleUpcomingRides(): Promise<void> {
    // Strict guard: userId must be a non-empty string (valid UUID)
    if (!this.userId || typeof this.userId !== "string" || this.userId.length < 10) return;

    const userId = this.userId; // capture for async safety
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60_000);

    // Fetch rides where user is driver (for ride reminder + payment reminder)
    const { data: driverRides } = await supabase
      .from("rides")
      .select("id, origin, destination, departure_time, seats_total, seats_available")
      .eq("driver_id", userId)
      .eq("status", "active")
      .gte("departure_time", now.toISOString())
      .lte("departure_time", twoHoursFromNow.toISOString());

    // Fetch rides where user is passenger (for payment reminder)
    const { data: passengerBookings } = await supabase
      .from("bookings")
      .select(`
        ride_id,
        ride:rides(id, origin, destination, departure_time, cost, driver_id)
      `)
      .eq("passenger_id", userId)
      .eq("status", "confirmed");

    // Schedule driver reminders
    if (driverRides) {
      for (const ride of driverRides) {
        this.scheduleRideReminder(ride);
        this.scheduleDriverPaymentReminder(ride);
      }
    }

    // Schedule passenger payment reminders
    if (passengerBookings) {
      for (const booking of passengerBookings) {
        const ride = (booking as any).ride;
        if (!ride) continue;
        this.schedulePassengerPaymentReminder(ride);
      }
    }
  }

  /**
   * 30 minutes before ride: remind driver about ride plans
   */
  private scheduleRideReminder(ride: any): void {
    if (!this.userId) return;
    const type = "ride_reminder" as const;
    const timerKey = `${ride.id}_${type}`;

    if (this.timers.has(timerKey) || this.isAlreadyScheduled(ride.id, type)) return;

    const departure = new Date(ride.departure_time);
    const fireAt = new Date(departure.getTime() - 30 * 60_000);
    const delay = fireAt.getTime() - Date.now();

    if (delay <= 0) {
      // If already past the 30-min mark but before departure, fire immediately
      if (Date.now() < departure.getTime()) {
        this.fireRideReminder(ride);
      }
      return;
    }

    const timer = setTimeout(() => {
      this.fireRideReminder(ride);
      this.timers.delete(timerKey);
    }, delay);

    this.timers.set(timerKey, timer);
    this.markScheduled({
      rideId: ride.id,
      type,
      fireAt: fireAt.toISOString(),
      userId: this.userId,
    });
  }

  /**
   * 15 minutes after ride departure: remind driver to collect payment
   */
  private scheduleDriverPaymentReminder(ride: any): void {
    if (!this.userId) return;
    const type = "payment_reminder" as const;
    const timerKey = `${ride.id}_driver_${type}`;

    if (this.timers.has(timerKey) || this.isAlreadyScheduled(ride.id, `driver_${type}`)) return;

    const departure = new Date(ride.departure_time);
    const fireAt = new Date(departure.getTime() + 15 * 60_000);
    const delay = fireAt.getTime() - Date.now();

    if (delay <= 0) return; // Already too late

    const timer = setTimeout(() => {
      this.fireDriverPaymentReminder(ride);
      this.timers.delete(timerKey);
    }, delay);

    this.timers.set(timerKey, timer);
    this.markScheduled({
      rideId: ride.id,
      type: `driver_${type}` as any,
      fireAt: fireAt.toISOString(),
      userId: this.userId,
    });
  }

  /**
   * 15 minutes after ride departure: remind passenger to pay
   */
  private schedulePassengerPaymentReminder(ride: any): void {
    if (!this.userId) return;
    const type = "payment_reminder" as const;
    const timerKey = `${ride.id}_passenger_${type}`;

    if (this.timers.has(timerKey) || this.isAlreadyScheduled(ride.id, `passenger_${type}`)) return;

    const departure = new Date(ride.departure_time);
    const fireAt = new Date(departure.getTime() + 15 * 60_000);
    const delay = fireAt.getTime() - Date.now();

    if (delay <= 0) return;

    const timer = setTimeout(() => {
      this.firePassengerPaymentReminder(ride);
      this.timers.delete(timerKey);
    }, delay);

    this.timers.set(timerKey, timer);
    this.markScheduled({
      rideId: ride.id,
      type: `passenger_${type}` as any,
      fireAt: fireAt.toISOString(),
      userId: this.userId,
    });
  }

  private async fireRideReminder(ride: any): Promise<void> {
    if (!this.userId) return;

    // Fetch passengers for this ride
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        pickup_point, dropoff_point,
        passenger:profiles!bookings_passenger_id_fkey(first_name, last_name)
      `)
      .eq("ride_id", ride.id)
      .eq("status", "confirmed");

    const passengerCount = bookings?.length || 0;
    const passengerNames = bookings
      ?.map((b: any) => `${b.passenger.first_name} ${b.passenger.last_name[0]}.`)
      .join(", ") || "אין נוסעים";

    const body = `🚗 הנסיעה שלך מ-${ride.origin} ל-${ride.destination} יוצאת בעוד 30 דקות!\n` +
      `👥 ${passengerCount} נוסעים: ${passengerNames}`;

    // In-app notification
    notificationStore.add(this.userId, {
      type: "ride_reminder",
      title: "⏰ תזכורת נסיעה",
      body,
      rideId: ride.id,
    });

    // Browser push
    notificationService.send("⏰ תזכורת נסיעה", {
      body,
      tag: `ride_reminder_${ride.id}`,
    });

    this.removeScheduled(ride.id, "ride_reminder");
  }

  private fireDriverPaymentReminder(ride: any): void {
    if (!this.userId) return;

    const passengersBooked = ride.seats_total - ride.seats_available;
    const totalExpected = passengersBooked * (ride.cost || 0);

    const body = `💰 הנסיעה מ-${ride.origin} ל-${ride.destination} הסתיימה.\n` +
      `צפוי לקבל ₪${totalExpected} מ-${passengersBooked} נוסעים. בדוק שכולם שילמו!`;

    notificationStore.add(this.userId, {
      type: "payment_reminder",
      title: "💰 תזכורת תשלום",
      body,
      rideId: ride.id,
    });

    notificationService.send("💰 תזכורת תשלום", {
      body,
      tag: `payment_reminder_driver_${ride.id}`,
    });

    this.removeScheduled(ride.id, "driver_payment_reminder");
  }

  private async firePassengerPaymentReminder(ride: any): Promise<void> {
    if (!this.userId) return;

    // Fetch driver info
    let driverName = "הנהג";
    let bitLink: string | null = null;
    if (ride.driver_id) {
      const { data: driver } = await supabase
        .from("profiles")
        .select("first_name, last_name, bit_link")
        .eq("id", ride.driver_id)
        .maybeSingle();
      if (driver) {
        driverName = `${driver.first_name} ${driver.last_name}`;
        bitLink = driver.bit_link;
      }
    }

    const body = `💳 אל תשכח לשלם ₪${ride.cost} ל${driverName} על הנסיעה מ-${ride.origin} ל-${ride.destination}`;

    notificationStore.add(this.userId, {
      type: "payment_reminder",
      title: "💳 שלמת לנהג?",
      body,
      rideId: ride.id,
      meta: { bitLink },
    });

    notificationService.send("💳 שלמת לנהג?", {
      body,
      tag: `payment_reminder_passenger_${ride.id}`,
    });

    this.removeScheduled(ride.id, "passenger_payment_reminder");
  }
}

export const notificationScheduler = new NotificationScheduler();
