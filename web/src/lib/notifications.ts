// Thin wrapper over the browser Notification API. We use it for soft alerts
// when a new event lands via Firestore (e.g. user added it from their phone)
// and when a sync completes. The real loud-alarm flow stays on Android.

import { getNotifSoundFromStorage } from "./preferences";

const SUPPORTED = typeof window !== "undefined" && "Notification" in window;

export function notificationsSupported(): boolean {
  return SUPPORTED;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!SUPPORTED) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!SUPPORTED) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

interface NotifyOptions {
  body?: string;
  tag?: string;
  silent?: boolean;
}

export function notify(title: string, options: NotifyOptions = {}): void {
  if (!SUPPORTED || Notification.permission !== "granted") return;
  const soundOn = getNotifSoundFromStorage();
  const silent = options.silent ?? !soundOn;
  try {
    new Notification(title, {
      body: options.body,
      tag: options.tag,
      icon: "/logo.png",
      badge: "/favicon-32.png",
      silent,
    });
  } catch {
    // Some browsers throw if called from non-secure or non-interactive context.
  }
}
