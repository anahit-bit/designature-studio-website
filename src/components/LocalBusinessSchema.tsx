import React from 'react';

/**
 * Site-wide JSON-LD: Organization (global brand) + InteriorDesignBusiness
 * (Yerevan local pack). Both live in one @graph with cross-referenced @ids
 * so Google reads "one entity, two facets" — strengthens local pack ranking
 * AND global brand entity recognition.
 *
 * Mounted once in App.tsx at the root, so every route ships it.
 *
 * Spec: WEBSITE-PLAN-S007-SEO-spec.md §2.
 */
export const LOCAL_BUSINESS_GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.designature.studio/#organization',
      name: 'Designature Studio',
      alternateName: 'Designature',
      url: 'https://www.designature.studio',
      logo: 'https://www.designature.studio/logo.svg',
      description:
        'Designer-led interior design studio shipping six deliverables per project, plus a suite of AI tools for interior design that anyone can use.',
      sameAs: [
        'https://www.instagram.com/designature_interior/',
        'https://www.facebook.com/Designature.Design.Studio',
      ],
      founder: {
        '@type': 'Person',
        name: 'Anahit Ghasabyan',
      },
    },
    {
      '@type': 'InteriorDesignBusiness',
      '@id': 'https://www.designature.studio/#business',
      parentOrganization: { '@id': 'https://www.designature.studio/#organization' },
      name: 'Designature Studio',
      url: 'https://www.designature.studio',
      image:
        'https://res.cloudinary.com/dys2k5muv/image/upload/v1772532381/1_h9ofqr.jpg',
      description:
        'Interior design studio based in Yerevan, Armenia. Designer-led, AI-augmented. Six deliverables per project — from concept to keys.',
      telephone: '+13474801265',
      email: 'hello@designature.studio',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Yerevan',
        addressRegion: 'Yerevan',
        addressCountry: 'AM',
      },
      areaServed: [
        { '@type': 'City', name: 'Yerevan' },
        { '@type': 'Country', name: 'Armenia' },
      ],
      priceRange: '$$',
      founder: {
        '@type': 'Person',
        name: 'Anahit Ghasabyan',
      },
    },
  ],
} as const;

const LocalBusinessSchema: React.FC = () => (
  <script
    type="application/ld+json"
    // Use dangerouslySetInnerHTML so the JSON is emitted as raw text inside
    // <script>, not as a child element. This is the standard pattern for
    // JSON-LD in React.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_GRAPH) }}
  />
);

export default LocalBusinessSchema;
