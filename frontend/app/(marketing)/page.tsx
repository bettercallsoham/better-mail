import AIChat from "@/components/landing-page/AiChat/AiChat";
import { ContainerWrap } from "@/components/landing-page/container";
import { DashboardSection } from "@/components/landing-page/DashboardSection/DashboardSection";
import CTASection from "@/components/landing-page/FAQ/CTA";
import FAQ from "@/components/landing-page/FAQ/FAQ";
import Card from "@/components/landing-page/FeaturesSection/Features";
import Footer from "@/components/landing-page/Footer/Footer";
import HeroSection from "@/components/landing-page/HeroSection/HeroSection";
import Navbar from "@/components/landing-page/Navbar";
// Client wrapper: lazily loads ImageCompare + tsparticles only in the browser.
import ImageCompare from "@/components/ui/ImageCompareLazy";
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen ">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ContainerWrap>
          <DashboardSection />
          <ImageCompare />
          <Card />
          <AIChat />
          <FAQ />
          <CTASection />
          <Footer />
        </ContainerWrap>
      </main>
    </div>
  );
}
