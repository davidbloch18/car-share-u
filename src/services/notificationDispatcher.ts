/**
 * Centralized notification dispatcher.
 * Call these functions from any part of the app to trigger both
 * in-app and browser push notifications for important events.
 */

import { notificationStore, type NotificationType } from "./notificationStore";
import { notificationService } from "./notificationService";

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  rideId?: string;
  meta?: Record<string, any>;
  /** If true, also send browser push notification (default: true) */
  push?: boolean;
}

/**
 * Send a notification (in-app + optional browser push)
 */
export function sendNotification(options: NotifyOptions): void {
  const { userId, type, title, body, rideId, meta, push = true } = options;

  // In-app
  notificationStore.add(userId, { type, title, body, rideId, meta });

  // Browser push
  if (push) {
    notificationService.send(title, {
      body,
      tag: `${type}_${rideId || Date.now()}`,
    });
  }
}

// ── Convenience functions for specific events ──────────────────────

/**
 * Notify driver that someone joined their ride
 */
export function notifyDriverNewPassenger(
  driverId: string,
  passengerName: string,
  rideOrigin: string,
  rideDestination: string,
  rideId: string,
  pickupPoint?: string,
  dropoffPoint?: string,
): void {
  const pickup = pickupPoint ? `\nנקודת איסוף: ${pickupPoint}` : "";
  const dropoff = dropoffPoint ? `\nנקודת הורדה: ${dropoffPoint}` : "";

  sendNotification({
    userId: driverId,
    type: "ride_booked",
    title: "🎉 נוסע חדש!",
    body: `${passengerName} הצטרף/ה לנסיעה ${rideOrigin} → ${rideDestination}${pickup}${dropoff}`,
    rideId,
  });
}

/**
 * Notify passenger that their booking was confirmed
 */
export function notifyPassengerBookingConfirmed(
  passengerId: string,
  driverName: string,
  rideOrigin: string,
  rideDestination: string,
  rideId: string,
  cost: number,
): void {
  sendNotification({
    userId: passengerId,
    type: "booking_confirmed",
    title: "✅ ההזמנה אושרה!",
    body: `הצטרפת לנסיעה של ${driverName} מ-${rideOrigin} ל-${rideDestination}. עלות: ₪${cost}`,
    rideId,
  });
}

/**
 * Notify all passengers that a ride was updated
 */
export function notifyRideUpdated(
  passengerIds: string[],
  rideOrigin: string,
  rideDestination: string,
  rideId: string,
  changeDescription: string,
): void {
  for (const passengerId of passengerIds) {
    sendNotification({
      userId: passengerId,
      type: "ride_updated",
      title: "📝 עדכון נסיעה",
      body: `הנסיעה ${rideOrigin} → ${rideDestination} עודכנה: ${changeDescription}`,
      rideId,
    });
  }
}

/**
 * Notify all passengers that a ride was cancelled
 */
export function notifyRideCancelled(
  passengerIds: string[],
  driverName: string,
  rideOrigin: string,
  rideDestination: string,
  rideId: string,
): void {
  for (const passengerId of passengerIds) {
    sendNotification({
      userId: passengerId,
      type: "ride_cancelled",
      title: "❌ נסיעה בוטלה",
      body: `הנסיעה של ${driverName} מ-${rideOrigin} ל-${rideDestination} בוטלה.`,
      rideId,
    });
  }
}
