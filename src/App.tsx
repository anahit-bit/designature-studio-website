
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import FAQPage from './components/FAQPage';
import CTABanner from './components/CTABanner';
import Footer from './components/Footer';
import { LanguageProvider } from './LanguageContext';
import { ProjectsProvider } from './ProjectsContext';
import SessionInactivityGuard from './components/SessionInactivityGuard';

const HomePage: React.FC = () => (
  <div className="min-h-screen bg-white font-body">
    <Header />
    <main>
      <Hero />
      <Services />
      <MultimodalSearch />
      <ProjectSection />
      <WhyChooseUs />
      <PricingSection />
      <Testimonials />
      <CTABanner />
    </main>
    <Footer />
  </div>
);

const PortfolioRoute: React.FC = () => (
  <div className="min-h-screen bg-white font-body">
    <Header />
    <PortfolioPage />
    <Footer />
  </div>
);

const ProjectDetailRoute: React.FC = () => (
  <div className="min-h-screen bg-white font-body">
    <Header />
    <ProjectDetail />
    <Footer />
  </div>
);

const AIConceptsRoute: React.FC = () => (
  <div className="min-h-screen bg-black font-body">
    <Header />
    <AIConceptsPage />
  </div>
);

const PricingRoute: React.FC = () => (
  <div className="min-h-screen bg-white font-body">
    <PricingPage />
  </div>
);

const AIVisionRoute: React.FC = () => (
  <div className="min-h-screen bg-black font-body">
    <Header />
    <AIVisionPage />
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    <LanguageProvider>
      <ProjectsProvider>
        <SessionInactivityGuard />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/portfolio" element={<PortfolioRoute />} />
          <Route path="/portfolio/:id" element={<ProjectDetailRoute />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/ai-concepts" element={<AIConceptsRoute />} />
          <Route path="/ai-vision" element={<AIVisionRoute />} />
          <Route path="/pricing" element={<PricingRoute />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProjectsProvider>
    </LanguageProvider>
  </BrowserRouter>
);

export default App;
