import { AssetVersioning } from "@/components/sections/AssetVersioning";
import { CloudLocal } from "@/components/sections/CloudLocal";
import { Comparison } from "@/components/sections/Comparison";
import { DatasetVersioning } from "@/components/sections/DatasetVersioning";
import { Developers } from "@/components/sections/Developers";
import { FailurePreservation } from "@/components/sections/FailurePreservation";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Hero } from "@/components/sections/Hero";
import { Immutability } from "@/components/sections/Immutability";
import { LargeData } from "@/components/sections/LargeData";
import { Lineage } from "@/components/sections/Lineage";
import { ParameterSpace } from "@/components/sections/ParameterSpace";
import { PlatformIndependence } from "@/components/sections/PlatformIndependence";
import { Problem } from "@/components/sections/Problem";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { Reproduction } from "@/components/sections/Reproduction";
import { Researchers } from "@/components/sections/Researchers";
import { SearchSection } from "@/components/sections/SearchSection";
import { Security } from "@/components/sections/Security";
import { SignatureAssembly } from "@/components/sections/SignatureAssembly";
import { ValueChain } from "@/components/sections/ValueChain";
import { Workflow } from "@/components/sections/Workflow";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <SignatureAssembly />
      <ValueChain />
      <Lineage />
      <Workflow />
      <LargeData />
      <DatasetVersioning />
      <AssetVersioning />
      <SearchSection />
      <Comparison />
      <ProductPreview />
      <Reproduction />
      <FailurePreservation />
      <Immutability />
      <ParameterSpace />
      <Researchers />
      <Developers />
      <PlatformIndependence />
      <Security />
      <CloudLocal />
      <FinalCTA />
    </>
  );
}
