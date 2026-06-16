
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import PortfolioPage from './components/PortfolioPage';
import ProjectDetail from './components/ProjectDetail';
import ServicesPage from './components/ServicesPage';
import StudioPage from './components/StudioPage';
import AIVisionPage from './components/AIVisionPage';
import AIConceptsPage from './components/AIConceptsPage';
import PricingPage from './components/PricingPage';
import FAQPage from './components/FAQPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import RefundPage from './components/RefundPage';
import DeliverablesPage from './components/DeliverablesPage';
import AdminPage from './components/AdminPage';
import AdminLoginPage from './components/AdminLoginPage';
import AdminUsersPage from './components/AdminUsersPage';
import Footer from './components/Footer';
import RouteTracker from './components/RouteTracker';
import HomeHeroText from './components/home/HomeHeroText';
import HomeImageBand from './components/home/HomeImageBand';
import HowItWorks from './components/home/HowItWorks';
import FeaturedWork from './components/home/FeaturedWork';
import AIToolsSection from './components/home/AIToolsSection';
import Voices from './components/home/Voices';
import ClosingBand from './components/home/ClosingBand';
import { LanguageProvider } from './LanguageContext';
import { ProjectsProvider } from './ProjectsContext';
import { RetailersProvider } from './RetailersContext';
import { AuthProvider } from './AuthContext';
import SessionInactivityGuard from './components/SessionInactivityGuard';

const HomePage: React.FC = () => (
  <div className="min-h-screen bg-white font-body">
    <Header />
    <main>
      <HomeHeroText />
      <HomeImageBand />
      <HowItWorks />
      <FeaturedWork />
      <AIToolsSection />
      <Voices />
      <ClosingBand />
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

const DeliverablesRoute: React.FC = () => (
  <div className="min-h-screen bg-white font-body">
    <Header />
    <DeliverablesPage />
    <Footer />
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    <RouteTracker />
    <LanguageProvider>
      <AuthProvider>
        <ProjectsProvider>
          <RetailersProvider>
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
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refund" element={<RefundPage />} />
            <Route path="/deliverables" element={<DeliverablesRoute />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </RetailersProvider>
        </ProjectsProvider>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
);

export default App;
