import { api } from "../api/client";
import { isIos, isStandalone } from "./platform";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && Boolean(VAPID_PUBLIC_KEY);
}

export async function getPushSubscriptionState(): Promise<"granted" | "denied" | "default"> {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function enablePushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported on this device or browser.");
  }

  if (isIos() && !isStandalone()) {
    throw new Error(
      "On iPhone/iPad, first add Shiftline to your Home Screen (Share button → Add to Home Screen), then open it from there to enable notifications.",
    );
  }

  if (Notification.permission === "denied") {
    throw new Error(
      "Notifications are blocked for this app in your browser or device settings. Allow notifications for Shiftline there, then try again.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
  });

  await api.subscribeToPush(subscription.toJSON());
}

export async function disablePushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.unsubscribeFromPush(endpoint);
}
