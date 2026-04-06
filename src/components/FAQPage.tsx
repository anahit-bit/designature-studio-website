import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import CTABanner from './CTABanner';

const FAQS = [
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
        a: 'Yes. You can select from 8 room types (Living Room, Dining Room, Bedroom, Kitchen, Bathroom, Home Office, Kids Room, Outdoor) and from over a dozen curated styles including Japandi, Mid-Century Modern, Bohemian, Art Deco, Biophilic, and more. Both fields are optional — the AI can also detect the room type automatically.',
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
        a: 'Currently the Shopping List searches US retailers including West Elm, Crate & Barrel, Walmart, Wayfair, and others. UK, EU, Armenia, and additional markets are coming soon.',
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
        a: 'The free plan includes unlimited Style Quiz, 3 AI Vision concepts, 3 shopping lists (each with PDF download), and access to the Room Audit in future. No credit card is ever required to sign up or use the free plan.',
      },
      {
        q: 'When will paid plans be available?',
        a: 'Paid plans (Design at $19/mo and Studio at $49/mo) are launching soon. You can join the waitlist from the Pricing page and we\'ll notify you the moment they go live.',
      },
      {
        q: 'What does the Design plan add over free?',
        a: 'The Design plan ($19/mo) adds 30 AI Vision credits per month, 20 shopping lists per month with budget filtering, 3 Room Audits, 1 Design Brief, and a 10% discount on full design projects.',
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
        a: 'The AI Studio is a bridge. If you love your generated concept and want to make it real, you can book a free conversation with our studio directly from the app. Design plan subscribers also receive a 10% discount on full design projects.',
      },
      {
        q: 'Is the first consultation really free?',
        a: 'Yes — the first conversation is always on us, no commitment required. We use it to understand your space, your goals, and whether a full design engagement makes sense for you.',
      },
    ],
  },
];

const FAQPage: React.FC = () => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pt-24 pb-20">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[1em] text-black/30 mb-6">FAQ</p>
          <h1 className="text-4xl md:text-6xl font-bold font-display tracking-architectural leading-[1] mb-6">
            Questions &amp; answers.
          </h1>
          <p className="text-black/50 text-sm md:text-base font-light leading-relaxed">
            Everything you need to know about the AI Studio, our design tools, and how we work.
          </p>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 md:px-16 pb-24">
        <div className="max-w-3xl flex flex-col gap-16">
          {FAQS.map((section) => (
            <div key={section.category}>
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#0047AB] mb-6">
                {section.category}
              </p>
              <div className="flex flex-col divide-y divide-black/8">
                {section.items.map((item, idx) => {
                  const key = `${section.category}-${idx}`;
                  const isOpen = !!openMap[key];
                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-start justify-between gap-6 py-5 text-left group"
                      >
                        <span className="text-sm md:text-base font-medium text-black group-hover:text-[#0047AB] transition-colors leading-snug">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-black/30 flex-shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <p className="text-[13px] text-black/55 leading-relaxed pb-5 pr-10">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CTABanner />
      <Footer />
    </div>
  );
};

export default FAQPage;
