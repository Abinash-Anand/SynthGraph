import { DashboardShowcase } from "@/components/sections/DashboardShowcase";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Lineage } from "@/components/sections/Lineage";
import { Problem } from "@/components/sections/Problem";
import { TrustedRecords } from "@/components/sections/TrustedRecords";
import { YourData } from "@/components/sections/YourData";
import { YourStack } from "@/components/sections/YourStack";

export default function HomePage() {
  return (
    <>
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
