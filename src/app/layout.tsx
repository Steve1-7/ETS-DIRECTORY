import type { Metadata } from "next";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "ETS-Directory | Find Local. Connect Direct.",
    template: "%s | ETS-Directory",
  },
  description:
    "Discover trusted local businesses and services across South Africa. Find local. Connect direct.",
  applicationName: "ETS-Directory",
  openGraph: {
    title: "ETS-Directory | Find Local. Connect Direct.",
    description:
      "Discover local businesses and services across South Africa.",
    siteName: "ETS-Directory",
    type: "website",
    locale: "en_ZA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <body><AnalyticsProvider>{children}</AnalyticsProvider></body>
    </html>
  );
}
