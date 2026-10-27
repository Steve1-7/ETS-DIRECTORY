import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "About ETS-Directory",
  description: "Learn about ETS-Directory, an independent business discovery platform by Eva-Tech-Studio.",
};

export default function AboutPage() {
  return (
    <InfoPage eyebrow="About us" title="A more direct way to find local">
      <p>ETS-Directory is an independent business discovery platform being built by Eva-Tech-Studio for South Africa. Our goal is to make it easier for people to discover local businesses and connect with them directly.</p>
      <p>Listings, verification, and paid promotion are separate concepts. A paid placement is not an endorsement, and a verification badge will only be used when a defined review process is in place.</p>
      <p>The platform is in development. Business listings and account features will become available as the directory is built and tested.</p>
    </InfoPage>
  );
}
