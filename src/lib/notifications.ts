export const checkNotificationPermission = () => {
  if (typeof window === 'undefined' || !("Notification" in window)) {
    return 'not-supported';
  }
  return Notification.permission;
};

export const isInsideIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = async (title: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || !("Notification" in window)) {
    console.warn("Notifications are not supported in this browser.");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted.");
    return;
  }

  try {
    // Try to use service worker for better mobile/background support
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await (registration as any).showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
          },
          ...options
        });
        return;
      }
    }
    
    // Fallback to basic Notification API if service worker is not ready or supported
    // Note: Some browsers (like Chrome on Android) require service worker for notifications
    // and will throw "Illegal constructor" if new Notification() is called.
    if (typeof Notification === 'function') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          ...options
        });
      } catch (e) {
        console.warn("Notification constructor failed, likely not supported in this context:", e);
      }
    }
  } catch (e) {
    console.error("Error sending notification:", e);
  }
};
