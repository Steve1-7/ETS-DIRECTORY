"use client";

import { useEffect, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useAnalyticsConsent } from "@/components/analytics-provider";

type ListingEvent = "profile_view" | "website_click" | "phone_click" | "whatsapp_click" | "directions_click";

function recordEvent(businessId: string, eventType: ListingEvent) {
  void fetch("/api/listing-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, eventType, consent: true }),
    keepalive: true,
  }).catch((error: unknown) => {
    console.error("Directory interaction could not be recorded:", error);
  });
}

export function ProfileViewTracker({ businessId }: { businessId: string }) {
  const consent = useAnalyticsConsent();

  useEffect(() => {
    if (consent !== "granted") return;
    const key = `ets-directory-view-${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch (error: unknown) {
      console.error("Profile view could not be deduplicated for this browser session:", error);
      return;
    }
    recordEvent(businessId, "profile_view");
  }, [businessId, consent]);

  return null;
}

export function TrackedLink({
  businessId,
  eventType,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  businessId: string;
  eventType: Exclude<ListingEvent, "profile_view">;
  children: ReactNode;
}) {
  const consent = useAnalyticsConsent();

  return <a {...props} onClick={(event) => {
    onClick?.(event);
    if (consent === "granted") recordEvent(businessId, eventType);
  }}>{children}</a>;
}
