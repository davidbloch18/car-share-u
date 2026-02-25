/**
 * Web Push Notification Service
 * Handles requesting permission and sending browser/OS-level notifications.
 * Works on iOS (Safari 16.4+ PWA), Android (Chrome), and desktop browsers.
 */

export type NotificationPermissionStatus = "granted" | "denied" | "default" | "unsupported";

class NotificationService {
  /**
   * Check if the browser supports the Notification API
   */
  isSupported(): boolean {
    return "Notification" in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermissionStatus {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission as NotificationPermissionStatus;
  }

  /**
   * Request permission to send notifications.
   * Must be called in response to a user gesture (click/tap).
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isSupported()) return "unsupported";

    try {
      const result = await Notification.requestPermission();
      return result as NotificationPermissionStatus;
    } catch {
      // Safari older versions use callback instead of promise
      return new Promise((resolve) => {
        Notification.requestPermission((result) => {
          resolve(result as NotificationPermissionStatus);
        });
      });
    }
  }

  /**
   * Send a browser push notification (shows even when tab is in background)
   */
  async send(title: string, options?: NotificationOptions & { onClick?: () => void }): Promise<void> {
    if (!this.isSupported()) return;
    if (Notification.permission !== "granted") return;

    const { onClick, ...notifOptions } = options || {};

    try {
      // Try service worker notifications first (works better on mobile / background)
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          dir: "rtl",
          lang: "he",
          ...notifOptions,
        });
        return;
      }
    } catch {
      // Fallback to regular Notification API
    }

    const notification = new Notification(title, {
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      dir: "rtl",
      lang: "he",
      ...notifOptions,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  }
}

export const notificationService = new NotificationService();
