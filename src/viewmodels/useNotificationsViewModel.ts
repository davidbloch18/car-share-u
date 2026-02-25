import { useState, useEffect, useCallback, useRef } from "react";
import { notificationStore, type AppNotification } from "@/services/notificationStore";
import { notificationService, type NotificationPermissionStatus } from "@/services/notificationService";
import { notificationScheduler } from "@/services/notificationScheduler";
import { useAuthViewModel } from "./useAuthViewModel";

export function useNotificationsViewModel() {
  const { session } = useAuthViewModel();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep a ref to avoid stale closure in the subscriber
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    const sync = () => {
      const uid = userIdRef.current;
      if (uid) {
        setNotifications(notificationStore.getAll(uid));
        setUnreadCount(notificationStore.getUnreadCount(uid));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    // Initial sync
    sync();

    // Subscribe to store changes
    const unsub = notificationStore.subscribe(sync);
    return unsub;
  }, [userId]);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    notificationService.getPermission()
  );

  // Start scheduler when user is logged in
  useEffect(() => {
    if (!userId) return;
    notificationScheduler.start(userId);
    return () => notificationScheduler.stop();
  }, [userId]);

  const requestPermission = useCallback(async () => {
    const result = await notificationService.requestPermission();
    setPermissionStatus(result);
    return result;
  }, []);

  const markRead = useCallback(
    (notificationId: string) => {
      if (userId) notificationStore.markRead(userId, notificationId);
    },
    [userId],
  );

  const markAllRead = useCallback(() => {
    if (userId) notificationStore.markAllRead(userId);
  }, [userId]);

  const removeNotification = useCallback(
    (notificationId: string) => {
      if (userId) notificationStore.remove(userId, notificationId);
    },
    [userId],
  );

  const clearAll = useCallback(() => {
    if (userId) notificationStore.clearAll(userId);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    permissionStatus,
    isSupported: notificationService.isSupported(),
    requestPermission,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
  } as const;
}
