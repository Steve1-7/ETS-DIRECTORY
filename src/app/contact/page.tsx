import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact information for ETS-Directory.",
};

export default function ContactPage() {
  return (
    <InfoPage eyebrow="Contact" title="We’re building a better way to find local">
      <p>ETS-Directory is currently in development. A public support email and enquiry form have not been configured yet, so please do not submit personal or confidential information through this preview.</p>
      <p>Business support and platform contact channels will be published before public launch.</p>
    </InfoPage>
  );
}
