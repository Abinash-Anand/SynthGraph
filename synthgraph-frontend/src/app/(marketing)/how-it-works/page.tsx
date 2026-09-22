import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { HowItWorksSequence } from "@/components/sections/HowItWorksSequence";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PageHero } from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How SynthGraph captures synthetic-data experiment provenance: instrument, generate, version, train, evaluate, trace, compare and reproduce.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Eight steps, one record."
        lede="A provenance record is built up in the order the research happens. Nothing here asks you to change how you generate data or how you train — only to write down what you did while you still know it."
      >
        <ButtonLink href="/demo" arrow>
          Request a Demo
        </ButtonLink>
      </PageHero>

      <section className="border-t border-line pt-4 pb-24">
        <HowItWorksSequence />
        <div className="shell mt-12">
          <Disclaimer />
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
