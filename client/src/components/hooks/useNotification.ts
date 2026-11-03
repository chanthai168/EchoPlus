// Notification Container / Manager
interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

type NotificationType = 'success' | 'error';


import { useState,useCallback } from "react";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback(
    (
      type: NotificationType,
      message: string,
      options?: { autoClose?: boolean; autoCloseDuration?: number }
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newNotification: NotificationItem = {
        id,
        type,
        message,
        autoClose: options?.autoClose ?? true,
        autoCloseDuration: options?.autoCloseDuration ?? 5000,
      };

      setNotifications((prev) => [...prev, newNotification]);
      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const success = useCallback(
    (message: string, options?: { autoClose?: boolean; autoCloseDuration?: number }) => {
      return addNotification('success', message, options);
    },
    [addNotification]
  );

  const error = useCallback(
    (message: string, options?: { autoClose?: boolean; autoCloseDuration?: number }) => {
      return addNotification('error', message, options);
    },
    [addNotification]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    NotificationSuccess:success,
    NotificationError:error,
    clearAll,
  };
};