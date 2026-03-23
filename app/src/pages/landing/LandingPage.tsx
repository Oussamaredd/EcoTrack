import { Suspense, lazy } from "react";
import DocumentMetadata from "../../components/DocumentMetadata";
import Navbar from "../../components/landing/Navbar";
import GradientGlow from "../../components/landing/background/GradientGlow";
import GridOverlay from "../../components/landing/background/GridOverlay";
import Vignette from "../../components/landing/background/Vignette";
import HeroSection from "../../components/landing/sections/HeroSection";
import { useLandingSectionScroll } from "../../hooks/useLandingSectionScroll";

const LogoMarqueeSection = lazy(() => import("../../components/landing/sections/LogoMarqueeSection"));
const FeaturesBentoSection = lazy(() => import("../../components/landing/sections/FeaturesBentoSection"));
const HowItWorksSection = lazy(() => import("../../components/landing/sections/HowItWorksSection"));
const PricingSection = lazy(() => import("../../components/landing/sections/PricingSection"));
const FaqSection = lazy(() => import("../../components/landing/sections/FaqSection"));
const FinalCtaSection = lazy(() => import("../../components/landing/sections/FinalCtaSection"));
const FooterSection = lazy(() => import("../../components/landing/sections/FooterSection"));

export default function LandingPage() {
  useLandingSectionScroll();

  return (
    <div className="landing-root">
      <DocumentMetadata
        title="EcoTrack | Smart Waste Operations"
        description="Coordinate route planning, citizen reporting, live container monitoring, and operational dashboards from one EcoTrack workspace."
        canonicalPath="/"
      />
      <GradientGlow />
      <GridOverlay />
      <Vignette />

      <div className="landing-content">
        <Navbar />

        <main>
          <HeroSection />
          <Suspense fallback={null}>
            <LogoMarqueeSection />
            <FeaturesBentoSection />
            <HowItWorksSection />
            <PricingSection />
            <FaqSection />
            <FinalCtaSection />
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <FooterSection />
        </Suspense>
      </div>
    </div>
  );
}
