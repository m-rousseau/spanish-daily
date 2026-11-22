"use client";

/** Full-page jump to the login screen when the session has expired (clears all in-memory state). */
export function goToLogin() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is intended here
  window.location.href = "/login";
}
