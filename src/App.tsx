
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import WhyChooseUs from './components/WhyChooseUs';
import MultimodalSearch from './components/MultimodalSearch';
import ProjectSection from './components/ProjectSection';
import PortfolioPage from './components/PortfolioPage';
import ProjectDetail from './components/ProjectDetail';
import ServicesPage from './components/ServicesPage';
import StudioPage from './components/StudioPage';
import AIVisionPage from './components/AIVisionPage';
import AIConceptsPage from './components/AIConceptsPage';
import Testimonials from './components/Testimonials';
import PricingSection from './components/PricingSection';
import PricingPage from './components/PricingPage';
import CTABanner from './components/CTABanner';
import Footer from './components/Footer';
import { LanguageProvider, useLanguage } from './LanguageContext';

const AppContent: React.FC = () => {
  const { currentPage } = useLanguage();

  if (currentPage === 'portfolio') {
    return (
      <div className="min-h-screen bg-white font-body">
        <Header />
        <PortfolioPage />
        <Footer />
      </div>
    );
  }

  if (currentPage === 'project-detail') {
    return (
      <div className="min-h-screen bg-white font-body">
        <Header />
        <ProjectDetail />
        <Footer />
      </div>
    );
  }

  if (currentPage === 'services') {
    return <ServicesPage />;
  }

  if (currentPage === 'studio') {
    return <StudioPage />;
  }

  if (currentPage === 'ai-concepts') {
    return (
      <div className="min-h-screen bg-black font-body">
        <Header />
        <AIConceptsPage />
      </div>
    );
  }

  if (currentPage === 'pricing') {
    return (
      <div className="min-h-screen bg-white font-body">
        <PricingPage />
      </div>
    );
  }

  if (currentPage === 'ai-vision') {
    return (
      <div className="min-h-screen bg-black font-body">
        <Header />
        <AIVisionPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />
      
      <main>
        <Hero />

        {/* 2. Services Section */}
        <Services />

        {/* 3. AI Vision Engine Section (Teaser) */}
        <MultimodalSearch />

        {/* 4. Projects Section - Landing Page Grid (4 items) */}
        <ProjectSection />

        {/* 5. Why Choose Us Section */}
        <WhyChooseUs />

        {/* 6. Pricing Section */}
        <PricingSection />

        {/* 7. Testimonials Section */}
        <Testimonials />

        {/* 7. CTA Banner Section */}
        <CTABanner />
      </main>

      <Footer />
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;
