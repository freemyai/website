import { ArchitectureSection } from "@/components/sections/architecture-section";
import { ContinuitySection } from "@/components/sections/continuity-section";
import { HeroSection } from "@/components/sections/hero-section";
import { OpenSourceSection } from "@/components/sections/open-source-section";
import { OwnerControlSection } from "@/components/sections/owner-control-section";
import { PillarsSection } from "@/components/sections/pillars-section";
import { PrinciplesStrip } from "@/components/sections/principles-strip";
import { ProblemSection } from "@/components/sections/problem-section";
import { ProductPreview } from "@/components/sections/product-preview";
import { RoadmapSection } from "@/components/sections/roadmap-section";
import { WaitlistSection } from "@/components/sections/waitlist-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProductPreview />
      <PrinciplesStrip />
      <ProblemSection />
      <PillarsSection />
      <ContinuitySection />
      <ArchitectureSection />
      <OwnerControlSection />
      <OpenSourceSection />
      <RoadmapSection />
      <WaitlistSection />
    </>
  );
}
