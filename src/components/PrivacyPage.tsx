import React from 'react';
import PolicyPage from './PolicyPage';
import privacyMd from '../content/policies/policy-privacy.md?raw';

const PrivacyPage: React.FC = () => (
  <PolicyPage
    eyebrow="Studio policies"
    docTitle="Privacy Policy — Designature Studio"
    content={privacyMd}
  />
);

export default PrivacyPage;
