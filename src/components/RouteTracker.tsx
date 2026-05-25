/**
 * RouteTracker — I-022: fires a GA4 page_view on every SPA route change.
 *
 * Mounted once inside <BrowserRouter>, renders nothing. Skips the initial
 * mount because gtag.js auto-fires page_view on first load (from the
 * `gtag('config', ID)` call inside initGA). Without the skip every visitor
 * would generate two page_view events for their landing page.
 *
 * If VITE_GA4_MEASUREMENT_ID is unset (localhost/dev), gtag never loads
 * and trackPageView() is a no-op — so this component is silent in dev.
 */
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

const RouteTracker: React.FC = () => {
  const location = useLocation();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    trackPageView(location.pathname + location.search, document.title);
  }, [location.pathname, location.search]);

  return null;
};

export default RouteTracker;
