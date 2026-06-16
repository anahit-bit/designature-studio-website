import React from 'react';
import PolicyPage from './PolicyPage';
import refundMd from '../content/policies/policy-refund.md?raw';

const RefundPage: React.FC = () => (
  <PolicyPage
    eyebrow="Studio policies"
    docTitle="Refund Policy — Designature Studio"
    content={refundMd}
  />
);

export default RefundPage;
