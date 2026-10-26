"use client";

import { useEffect } from "react";

// Production only: a service worker would get in the way of hot reload during development.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // A worker left by a production run on the same address would serve stale build files.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => void registration.unregister()));
      return;
    }
    // Installing the app is optional, so a failed registration is silently ignored.
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);

  return null;
}
