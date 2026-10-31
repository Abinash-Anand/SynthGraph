import { DashboardShowcase } from "@/components/sections/DashboardShowcase";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Lineage } from "@/components/sections/Lineage";
import { Problem } from "@/components/sections/Problem";
import { TrustedRecords } from "@/components/sections/TrustedRecords";
import { YourData } from "@/components/sections/YourData";
import { YourStack } from "@/components/sections/YourStack";
import { PRODUCT } from "@/data/product";
import { SITE } from "@/data/site";

// Structured data for search engines. Static text only: nothing here comes from a user.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description:
    "Open source provenance for synthetic-data research: records where training data came from and what it trained.",
  softwareVersion: PRODUCT.sdkVersion,
  license: "https://opensource.org/licenses/MIT",
  codeRepository: PRODUCT.repoUrl,
  url: SITE.url,
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
      <Hero />
      <Problem />
      <HowItWorks />
      <Lineage />
      <DashboardShowcase />
      <TrustedRecords />
      <YourStack />
      <YourData />
      <FinalCTA />
    </>
  );
}
