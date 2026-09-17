import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { GettingStartedSection } from "@/components/GettingStartedSection";
import { RolePathsSection } from "@/components/RolePathsSection";
import { CoreFlowSection } from "@/components/CoreFlowSection";
import { OnChainArchitectureSection } from "@/components/OnChainArchitectureSection";
import { QuickLookupSection } from "@/components/QuickLookupSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <Navbar />
      <GettingStartedSection />

      <main className="relative z-10">
        <HeroSection />
        <RolePathsSection />
        <CoreFlowSection />
        <OnChainArchitectureSection />
        <QuickLookupSection />
      </main>

      <Footer />
    </div>
  );
}
