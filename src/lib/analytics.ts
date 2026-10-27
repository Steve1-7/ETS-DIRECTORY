"use client";

export type AnalyticsEvent = "page_view" | "search";
export type AnalyticsDevice = "mobile" | "tablet" | "desktop";

export const analyticsConsentKey = "ets-directory-analytics-consent";
const analyticsSessionKey = "ets-directory-analytics-session";
const profileViewKeyPrefix = "ets-directory-view-";

export function hasAnalyticsConsent() {
  try {
    return window.localStorage.getItem(analyticsConsentKey) === "granted";
  } catch {
    return false;
  }
}

export function getAnalyticsSessionId() {
  try {
    let sessionId = window.sessionStorage.getItem(analyticsSessionKey);
    if (!sessionId) {
      sessionId = window.crypto.randomUUID();
      window.sessionStorage.setItem(analyticsSessionKey, sessionId);
    }
    return sessionId;
  } catch {
    return null;
  }
}

export function clearAnalyticsSession() {
  try {
    window.sessionStorage.removeItem(analyticsSessionKey);
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(profileViewKeyPrefix)) window.sessionStorage.removeItem(key);
    }
  } catch {
    console.error("Analytics session data could not be cleared from this browser.");
  }
}

export function getAnalyticsDevice(): AnalyticsDevice {
  if (window.innerWidth <= 767) return "mobile";
  if (window.innerWidth <= 1024) return "tablet";
  return "desktop";
}

export function getExternalReferrerDomain() {
  if (!document.referrer) return null;
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return null;
    return referrer.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function recordSiteActivity(eventType: AnalyticsEvent, pagePath: string) {
  if (!hasAnalyticsConsent()) return;
  const sessionId = getAnalyticsSessionId();
  if (!sessionId) return;

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      eventType,
      pagePath,
      referrerDomain: getExternalReferrerDomain(),
      deviceCategory: getAnalyticsDevice(),
    }),
    keepalive: true,
  }).catch((error: unknown) => {
    console.error("Site analytics could not be recorded:", error);
  });
}
