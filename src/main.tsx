import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initGA } from './lib/analytics';
import './index.css';

initGA();

// A page reload should land at the top, not restore the previous scroll position
// (the app already scrolls to top on every route change). Turn off the browser's
// automatic scroll restoration so refreshing a long article starts at the top.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
