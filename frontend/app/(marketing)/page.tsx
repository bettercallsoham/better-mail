import AIChat from "@/components/AiChat/AiChat";
import { ContainerWrap } from "@/components/container";
import { DashboardSection } from "@/components/DashboardSection/DashboardSection";
import CTASection from "@/components/FAQ/CTA";
import FAQ from "@/components/FAQ/FAQ";
import Card from "@/components/FeaturesSection/Features";
import Footer from "@/components/Footer/Footer";
import HeroSection from "@/components/HeroSection/HeroSection";
import ImageCompare from "@/components/ui/ImageCompare";
import Navbar from "@/components/landing-page/Navbar";
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
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
