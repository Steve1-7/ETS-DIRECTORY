"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { analyticsConsentKey, clearAnalyticsSession, recordSiteActivity } from "@/lib/analytics";

type Consent = "unknown" | "granted" | "denied";
const AnalyticsConsentContext = createContext<Consent>("unknown");

export function useAnalyticsConsent() {
  return useContext(AnalyticsConsentContext);
}

export function AnalyticsConsentField() {
  const consent = useAnalyticsConsent();
  return <input name="analyticsConsent" type="hidden" value={consent === "granted" ? "granted" : "denied"} />;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>("unknown");
  const [showSettings, setShowSettings] = useState(false);
  const [consentError, setConsentError] = useState(false);

  useEffect(() => {
    let saved: string | null;
    try {
      saved = window.localStorage.getItem(analyticsConsentKey);
    } catch {
      setConsent("denied");
      return;
    }

    if (saved === "granted") {
      void fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: "granted" }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Consent update failed (${response.status}).`);
        setConsent("granted");
      }).catch(() => {
        setConsent("denied");
        setConsentError(true);
      });
    } else {
      setConsent(saved === "denied" ? "denied" : "unknown");
    }

    const syncConsent = (event: StorageEvent) => {
      if (event.key === analyticsConsentKey) {
        setConsent(event.newValue === "granted" || event.newValue === "denied" ? event.newValue : "unknown");
      }
    };
    window.addEventListener("storage", syncConsent);
    return () => window.removeEventListener("storage", syncConsent);
  }, []);

  useEffect(() => {
    if (consent === "granted" && pathname) recordSiteActivity("page_view", pathname);
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "granted") return;
    const onSearch = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      try {
        if (new URL(target.action, window.location.href).pathname === "/search") {
          recordSiteActivity("search", "/search");
        }
      } catch {
        console.error("Search analytics could not be recorded: invalid form action.");
      }
    };
    document.addEventListener("submit", onSearch, true);
    return () => document.removeEventListener("submit", onSearch, true);
  }, [consent]);

  const saveConsent = useCallback(async (value: Exclude<Consent, "unknown">) => {
    if (value === "denied") {
      setConsent("denied");
      try {
        window.localStorage.setItem(analyticsConsentKey, value);
        clearAnalyticsSession();
      } catch {
        setConsentError(true);
      }
    }
    try {
      const response = await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: value }),
      });
      if (!response.ok) throw new Error(`Consent update failed (${response.status}).`);
      window.localStorage.setItem(analyticsConsentKey, value);
      setConsentError(false);
      setConsent(value);
      setShowSettings(false);
    } catch {
      setConsent("denied");
      setConsentError(true);
    }
  }, []);

  return (
    <AnalyticsConsentContext.Provider value={consent}>
      {children}
      {consent === "unknown" || showSettings ? (
        <aside aria-label="Analytics privacy settings" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl sm:inset-x-6">
          <h2 className="text-base font-extrabold">Your analytics choice</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            With your permission, we count page views, searches, listing interactions, referrer domains, and broad device categories. Analytics uses a temporary session ID, does not collect your name, account, IP address, or search terms, and is deleted after 30 days. You can change your choice at any time.{" "}
            <Link className="font-semibold text-[var(--green)] underline" href="/privacy">Read the privacy notice</Link>.
          </p>
          {consentError && <p role="alert" className="mt-2 text-sm text-red-700">Your choice could not be saved. Analytics will stay off until your permission can be confirmed.</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-bold" onClick={() => saveConsent("denied")} type="button">Reject analytics</button>
            <button className="min-h-10 rounded-lg bg-[var(--green)] px-4 text-sm font-bold text-white" onClick={() => saveConsent("granted")} type="button">Allow analytics</button>
          </div>
        </aside>
      ) : (
        <button
          aria-label="Change analytics privacy settings"
          className="fixed bottom-3 right-3 z-40 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] shadow"
          onClick={() => setShowSettings(true)}
          type="button"
        >
          Privacy settings
        </button>
      )}
    </AnalyticsConsentContext.Provider>
  );
}
