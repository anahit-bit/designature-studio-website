/**
 * FAQ content — single source of truth.
 *
 * Consumed by BOTH:
 *   - src/components/FAQPage.tsx (the rendered accordion humans see)
 *   - server/seo/jsonld.ts + server/seo/render.ts (FAQPage JSON-LD + the
 *     JS-less prerender on /faq)
 *
 * Keeping the copy here means the structured data and the visible page can never
 * drift apart. Edit questions/answers in this file only.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  category: string;
  items: FaqItem[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    category: 'AI Studio — General',
    items: [
      {
        q: 'What is the AI Studio and who is it for?',
        a: 'The AI Studio is a set of AI-powered design tools built for homeowners, renters, and design enthusiasts who want professional interior guidance without a full project commitment. It includes Style Quiz, AI Vision, Shopping List, and Room Audit — each designed to help you at a different stage of your design journey.',
      },
      {
        q: 'Do I need an account to use the AI tools?',
        a: 'You need to sign in with Google to access the AI tools. Sign-in is free and takes seconds. The free plan gives you 3 AI Vision concepts, 3 shopping lists, and unlimited style quiz attempts — no credit card required.',
      },
      {
        q: 'Is my data private? Who sees my uploaded photos?',
        a: 'Your photos are sent directly to Google\'s Gemini AI model to generate your concept — they are not stored on our servers or shared with third parties. Generated concepts are session-only on the free plan and are not retained after you close the tab.',
      },
    ],
  },
  {
    category: 'AI Vision — Room Redesign',
    items: [
      {
        q: 'How does AI Vision work?',
        a: 'Upload a photo of your room, optionally add inspiration images, choose your room type and preferred style, then hit Generate. Our AI analyzes the space and produces a photorealistic redesign that respects the room\'s architecture while applying a fresh interior design direction.',
      },
      {
        q: 'How accurate are the generated concepts?',
        a: 'AI Vision produces photorealistic renders that capture proportions, lighting, and style well. They are design concepts — not technical drawings — and work best as a visual starting point for conversation with a designer or for exploring directions before committing to purchases.',
      },
      {
        q: 'Can I choose the room type and style?',
        a: 'Yes. You can select from 10 room types (Living, Dining, Living + Dining, Bedroom, Kitchen, Bathroom, Home Office, Hallway, Kids Room, Outdoor) and from 15 curated styles including Japandi, Mid-Century, Bohemian, Art Deco, Biophilic, Minimalist and Trend 2026. The room is optional — leave it on Auto-detect and we read it from your photo, and tell you what we read before you generate. The style is optional too, but only if you add reference photos instead: every concept needs one or the other.',
      },
      {
        q: 'What makes a good input photo?',
        a: 'Good lighting and a clear view of the room make the biggest difference. A wide-angle shot that shows the floor, walls, and ceiling gives the AI the most context. Avoid very dark or blurry photos — they reduce the quality of the output.',
      },
      {
        q: 'Can I add inspiration images?',
        a: 'Yes — you can upload up to 5 inspiration images (rooms you love, color palettes, furniture you\'ve saved). The AI treats these as style references and blends them with your room photo to create a result that feels closer to your taste.',
      },
    ],
  },
  {
    category: 'Shopping List',
    items: [
      {
        q: 'How does the Shopping List work?',
        a: 'Once you have a generated concept (or any interior photo), the Shopping List tool scans the image, identifies the key furniture and decor items, and searches real retailer databases to find matching products — complete with prices and links.',
      },
      {
        q: 'Are the products exact matches to what\'s in the image?',
        a: 'Not necessarily. The AI identifies item categories and descriptions (e.g. "cream upholstered armchair with wood legs") and finds the closest available products from real retailers. Always verify dimensions, materials, and quality before purchasing — products are AI-matched suggestions, not guaranteed duplicates.',
      },
      {
        q: 'Which countries and retailers are supported?',
        a: 'Currently the Shopping List searches US and UK retailers including West Elm, Crate & Barrel, John Lewis, and others. EU, Armenia, and additional markets are coming soon.',
      },
      {
        q: 'Can I shop from a photo I didn\'t generate with AI Vision?',
        a: 'Yes. Use Option B on the Shopping List card to upload any interior photo — a room from Pinterest, a magazine, a hotel you loved — and we\'ll find real products that match it.',
      },
      {
        q: 'Can I download my shopping list?',
        a: 'Yes. After results are generated, there\'s a Download PDF button at the bottom of the results. Note that the list is not saved between sessions on the free plan, so download it before closing the tab.',
      },
    ],
  },
  {
    category: 'Style Quiz',
    items: [
      {
        q: 'What does the Style Quiz do?',
        a: 'The Style Quiz shows you pairs of room images and asks you to vote for the one that feels most like you. After a few rounds it identifies your dominant design style (e.g. Japandi, Bohemian, Art Deco) and explains the elements that define it. You can then apply that style to your AI Vision generation.',
      },
      {
        q: 'How many questions are in the quiz?',
        a: 'The quiz is ongoing — you can vote as many times as you like. Results update in real time as you vote. Most people get a clear style profile after 8–12 votes.',
      },
    ],
  },
  {
    category: 'Pricing & Plans',
    items: [
      {
        q: 'What\'s included in the free plan?',
        a: 'Every new account gets 50 credits, once, with no card required — enough to try every tool on your own room. Find My Style is always free and never costs credits. Credits are the only limit; nothing is feature-locked. Free exports carry a small watermark.',
      },
      {
        q: 'How much do paid credits cost?',
        a: 'You can buy a one-time credit pack that never expires — Starter (400 credits, $39), Project (3,000 credits, $129), or Project Plus (6,500 credits, $249) — or subscribe monthly for $49 and get 1,000 fresh credits each month. As a guide, one photoreal room render is about 10 credits.',
      },
      {
        q: 'What\'s the difference between a pack and the monthly subscription?',
        a: 'A one-time pack is a single payment and its credits never expire, so you move at your own pace — ideal for a single project. The $49/month subscription refills to 1,000 credits each month (they don\'t roll over) and carries a commercial-use licence, for continuous professional work. Every tool is available either way.',
      },
    ],
  },
  {
    category: 'Working with Designature Studio',
    items: [
      {
        q: 'Can the AI replace a real interior designer?',
        a: 'Not entirely — and we\'re honest about that. AI Vision is a powerful starting point: it lets you explore directions, get inspired, and walk into a designer conversation with a clear visual language. The nuance of material selection, spatial planning, and project management still benefits enormously from a human designer who knows your home.',
      },
      {
        q: 'How does the AI Studio connect to your design services?',
        a: 'The AI Studio is a bridge. If you love your generated concept and want to make it real, you can book a free conversation with our studio directly from the app.',
      },
      {
        q: 'Is the first consultation really free?',
        a: 'Yes — the first conversation is always on us, no commitment required. We use it to understand your space, your goals, and whether a full design engagement makes sense for you.',
      },
    ],
  },
];
