import HomeBanner from "@/components/home-banner";
import BentoSection from "@/components/marketing/bento";
import Faq from "@/components/marketing/faq";
import FinalCta from "@/components/marketing/final-cta";
import Hero from "@/components/marketing/hero";
import ReturnPaths from "@/components/marketing/return-paths";
import StatsBand from "@/components/marketing/stats-band";
import StepLoop from "@/components/marketing/step-loop";
import Trust from "@/components/marketing/trust";

export default function Home() {
  return (
    <div className="mf-page">
      <HomeBanner />
      <Hero />
      <StepLoop />
      <BentoSection />
      <StatsBand />
      <ReturnPaths />
      <Trust />
      <Faq />
      <FinalCta />
    </div>
  );
}
