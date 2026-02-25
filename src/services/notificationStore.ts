/**
 * In-app notification store backed by localStorage.
 * Persists notifications per user and provides a reactive subscriber model.
 */

export type NotificationType =
  | "ride_booked"        // someone joined your ride
  | "booking_confirmed"  // your booking was confirmed
  | "ride_reminder"      // 30 min before ride departure
  | "payment_reminder"   // 15 min after ride (remind passengers to pay)
  | "ride_updated"       // ride was updated by driver
  | "ride_cancelled"     // ride was cancelled
  | "new_ride_posted"    // driver posted a new ride
  | "general";           // generic notification

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO timestamp */
  timestamp: string;
  read: boolean;
  /** Optional ride id to link to */
  rideId?: string;
  /** Optional metadata */
  meta?: Record<string, any>;
}

const STORAGE_PREFIX = "rideshare_notifications_";
const MAX_NOTIFICATIONS = 100;

type Listener = () => void;

class NotificationStore {
  private listeners = new Set<Listener>();

  private getKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
  }

  /**
   * Get all notifications for a user
   */
  getAll(userId: string): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.getKey(userId));
      if (!raw) return [];
      return JSON.parse(raw) as AppNotification[];
    } catch {
      return [];
    }
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    return this.getAll(userId).filter((n) => !n.read).length;
  }

  /**
   * Add a new notification
   */
  add(userId: string, notification: Omit<AppNotification, "id" | "timestamp" | "read">): AppNotification {
    const notif: AppNotification = {
      ...notification,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const all = this.getAll(userId);
    // Prepend new notification and cap at MAX
    const updated = [notif, ...all].slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(this.getKey(userId), JSON.stringify(updated));
    this.notify();
    return notif;
  }

  /**
   * Mark a notification as read
   */
  markRead(userId: string, notificationId: string): void {
    const all = this.getAll(userId);
    const idx = all.findIndex((n) => n.id === notificationId);
    if (idx >= 0) {
      all[idx].read = true;
      localStorage.setItem(this.getKey(userId), JSON.stringify(all));
      this.notify();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllRead(userId: string): void {
    const all = this.getAll(userId);
    const updated = all.map((n) => ({ ...n, read: true }));
    localStorage.setItem(this.getKey(userId), JSON.stringify(updated));
    this.notify();
  }

  /**
   * Delete a notification
   */
  remove(userId: string, notificationId: string): void {
    const all = this.getAll(userId);
    const updated = all.filter((n) => n.id !== notificationId);
    localStorage.setItem(this.getKey(userId), JSON.stringify(updated));
    this.notify();
  }

  /**
   * Clear all notifications for a user
   */
  clearAll(userId: string): void {
    localStorage.removeItem(this.getKey(userId));
    this.notify();
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const notificationStore = new NotificationStore();
