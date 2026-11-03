import React, { useState, useEffect, useCallback } from 'react';

// Types
type NotificationType = 'success' | 'error';

interface NotificationProps {
  type: NotificationType;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

// Icons
const SuccessIcon = () => (
  <svg
    className="h-6 w-6 text-green-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg
    className="h-6 w-6 text-red-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Individual Notification Component
export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  autoClose = false,
  autoCloseDuration = 3000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDuration, handleClose]);

  if (!isVisible) return null;

  const styles = {
    success: {
      container: 'glass-success',
      text: 'text-green-800',
      icon: <SuccessIcon />,
    },
    error: {
      container: 'glass-error',
      text: 'text-red-600',
      icon: <ErrorIcon />,
    },
  };

  const currentStyle = styles[type];

  return (
    <div
      className={`relative flex items-start rounded-2xl p-4 shadow-md transition-all duration-300 ${currentStyle.container}`}
      role="alert"
    >
      <div className="ml-3 flex-1 items-center">
        <p className={`text-sm font-medium ${currentStyle.text}`}>{message}</p>
      </div>
      {onClose && (
        <div className="ml-4 shrink-0">
          <button
            onClick={handleClose}
            className="glass rounded-full inline-flex p-1.5 "
            aria-label="Dismiss notification"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
};

// Notification Container / Manager
interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

interface NotificationContainerProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${positionClasses[position]}`}
      aria-live="polite"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => onRemove(notification.id)}
          autoClose={notification.autoClose}
          autoCloseDuration={notification.autoCloseDuration}
        />
      ))}
    </div>
  );
};