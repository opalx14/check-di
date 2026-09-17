import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { GettingStartedSection } from "@/components/GettingStartedSection";
import { InteractiveSandbox } from "@/components/InteractiveSandbox";
import { CoreFlowSection } from "@/components/CoreFlowSection";
import { DualTrackSection } from "@/components/DualTrackSection";
import { OnChainArchitectureSection } from "@/components/OnChainArchitectureSection";
import { ComplianceBanner } from "@/components/ComplianceBanner";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Cyber Grid */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />

      {/* Main App Layout */}
      <Navbar />

      <main className="relative z-10">
        <HeroSection />
        <GettingStartedSection />
        <CoreFlowSection />
        <InteractiveSandbox />
        <DualTrackSection />
        <OnChainArchitectureSection />
        <ComplianceBanner />
      </main>

      <Footer />
    </div>
  );
}
