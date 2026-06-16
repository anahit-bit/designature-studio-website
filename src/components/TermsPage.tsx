import React from 'react';
import PolicyPage from './PolicyPage';
import termsMd from '../content/policies/policy-terms.md?raw';

const TermsPage: React.FC = () => (
  <PolicyPage
    eyebrow="Studio policies"
    docTitle="Terms of Service — Designature Studio"
    content={termsMd}
  />
);

export default TermsPage;
