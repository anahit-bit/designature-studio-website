import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VisionExperience from '../components/VisionExperience';
import { LanguageProvider } from '../LanguageContext';

// VisionExperience now reads copy via useLanguage(), so it must render inside a
// LanguageProvider (which itself needs a Router for useLocation()).
const renderVE = () => render(
  <MemoryRouter><LanguageProvider><VisionExperience {...baseProps} /></LanguageProvider></MemoryRouter>
);

// Minimal stub props — only what State 3 (renderState3Hero) actually reads.
const baseProps = {
  roomImage: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1/sample-room.png',
  inspirationImages: [],
  selectedStyle: '',
  setSelectedStyle: () => {},
  selectedRoom: 'Living',
  setSelectedRoom: () => {},
  isProcessing: false,
  results: ['https://res.cloudinary.com/dys2k5muv/image/upload/v1/concept-1.png'],
  sessionConceptArchive: [],
  allSessionConcepts: ['https://res.cloudinary.com/dys2k5muv/image/upload/v1/concept-1.png'],
  selectedConceptIndex: 0,
  setSelectedConceptIndex: () => {},
  selectedConceptUrl: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1/concept-1.png',
  handleFileChange: () => {},
  handleDrop: () => {},
  handleGenerate: () => {},
  handleReset: () => {},
  handleDownload: () => {},
  handleTrySampleRoom: () => {},
  removeInspirationImage: () => {},
  handlePinterestPaste: async () => {},
  pinterestUrl: '',
  setPinterestUrl: () => {},
  pinterestError: '',
  setPinterestError: () => {},
  pinterestLoading: false,
  isGenerateDisabled: false,
  isSampleLoading: false,
  processingStage: 'extract' as const,
  processingPhase: 0,
  PROCESSING_PHASES: ['Analyzing'],
  maxConceptSlots: 3,
  generationsLeft: 3,
  unlimitedLabel: 'Unlimited',
  remainingLabel: 'remaining',
  quizResult: [],
  quizDone: false,
  isPaid: false,
  navigateTo: () => {},
  setFeedbackOpen: () => {},
  shopCurrentConcept: () => {},
  onShopThisRoom: () => {},
  validationError: null,
  error: null,
  setError: () => {},
  isLightboxOpen: false,
  setIsLightboxOpen: () => {},
  translateStyle: (s: string) => s,
};

describe('VisionExperience · Shop-this-room handoff (#22)', () => {
  it('"Shop this room" CTA calls onShopThisRoom with the selected concept URL', () => {
    const onShopThisRoom = vi.fn();
    render(
      <MemoryRouter><LanguageProvider>
        <VisionExperience {...baseProps} onShopThisRoom={onShopThisRoom} />
      </LanguageProvider></MemoryRouter>
    );
    fireEvent.click(screen.getByText(/Shop this room/i));
    expect(onShopThisRoom).toHaveBeenCalledTimes(1);
    expect(onShopThisRoom).toHaveBeenCalledWith(baseProps.selectedConceptUrl);
  });

  it('"Get this designed" is demoted to the end-of-funnel conversion band (still present)', () => {
    render(
      <MemoryRouter><LanguageProvider>
        <VisionExperience {...baseProps} />
      </LanguageProvider></MemoryRouter>
    );
    expect(screen.getByText(/Get this designed/i)).toBeInTheDocument();
  });
});

describe('VisionExperience · AI-030 adaptive result hero', () => {
  it('defaults to landscape mode (30/70, object-contain, 78vh) before the concept image loads', () => {
    const { container } = renderVE();
    const section = container.querySelector('section.vision-result-hero') as HTMLElement | null;
    expect(section).not.toBeNull();
    expect(section!.getAttribute('aria-label')).toBe('Result · landscape layout');
    expect(section!.style.height).toBe('78vh');
    expect(section!.style.aspectRatio).toBe('');

    const beforePane = section!.querySelector('.vision-pane-before') as HTMLElement;
    const afterPane = section!.querySelector('.vision-pane-after') as HTMLElement;
    expect(beforePane.style.width).toBe('30%');
    expect(afterPane.style.width).toBe('70%');

    // AI-030g: object-contain is now used in BOTH modes — never crop the
    // generated concept; letterbox if pane aspect doesn't match image aspect.
    const conceptImg = afterPane.querySelector('img');
    expect(conceptImg?.className).toMatch(/object-contain/);
    expect(conceptImg?.className).not.toMatch(/object-cover/);
  });

  it('switches to portrait mode (50/50, object-contain, explicit width/height) when concept image is portrait', () => {
    const { container } = renderVE();
    const section = container.querySelector('section.vision-result-hero') as HTMLElement;
    const conceptImg = section.querySelector('.vision-pane-after img') as HTMLImageElement;

    // Simulate a portrait image load: naturalWidth=1080, naturalHeight=1920 → aspect 0.5625.
    Object.defineProperty(conceptImg, 'naturalWidth', { value: 1080, configurable: true });
    Object.defineProperty(conceptImg, 'naturalHeight', { value: 1920, configurable: true });
    act(() => {
      conceptImg.dispatchEvent(new Event('load', { bubbles: true }));
    });

    expect(section.getAttribute('aria-label')).toBe('Result · portrait layout');
    // AI-030h: portrait section width is computed from sideBySideAspect = aspect × 2
    // (so two abutting portrait images fit perfectly, no internal letterboxing). For
    // a 0.5625 concept aspect, sideBySideAspect = 1.125 — that's the outer multiplier
    // in the width calc. jsdom 27 accepts min() inside calc() but is inconsistent
    // about top-level min(), so we assert on the width expression (where the formula
    // survives) plus class + maxWidth + data-attrs.
    const styleAttr = section.getAttribute('style') ?? '';
    expect(styleAttr).toMatch(/width:\s*calc\(min\(90vh[\s\S]*?\)\s*\*\s*1\.125\)/);
    expect(styleAttr).toMatch(/max-width:\s*100vw/);
    expect(section.className).toMatch(/\bmx-auto\b/);
    expect(section.className).not.toMatch(/\bw-full\b/);
    // AI-030h debug data-attrs:
    expect(section.getAttribute('data-is-portrait')).toBe('true');
    expect(section.getAttribute('data-concept-aspect')).toBe('0.5625');
    expect(section.getAttribute('data-side-by-side-aspect')).toBe('1.125');

    // Outer wrapper provides the full-width black background for letterboxing.
    const wrapper = section.parentElement as HTMLElement;
    expect(wrapper.className).toMatch(/w-full/);
    expect(wrapper.className).toMatch(/bg-black/);

    const beforePane = section.querySelector('.vision-pane-before') as HTMLElement;
    const afterPane = section.querySelector('.vision-pane-after') as HTMLElement;
    expect(beforePane.style.width).toBe('50%');
    expect(afterPane.style.width).toBe('50%');

    const divider = section.querySelector('.vision-divider') as HTMLElement;
    expect(divider.style.left).toBe('50%');

    const reReadImg = afterPane.querySelector('img');
    expect(reReadImg?.className).toMatch(/object-contain/);
  });

  it('treats square (aspect = 1.0) as landscape — no break', () => {
    const { container } = renderVE();
    const section = container.querySelector('section.vision-result-hero') as HTMLElement;
    const conceptImg = section.querySelector('.vision-pane-after img') as HTMLImageElement;

    Object.defineProperty(conceptImg, 'naturalWidth', { value: 1024, configurable: true });
    Object.defineProperty(conceptImg, 'naturalHeight', { value: 1024, configurable: true });
    act(() => {
      conceptImg.dispatchEvent(new Event('load', { bubbles: true }));
    });

    expect(section.getAttribute('aria-label')).toBe('Result · landscape layout');
    expect(section.style.height).toBe('78vh');
    expect(section.style.aspectRatio).toBe('');
  });

});

describe('VisionExperience · locked marquee band (§2 — Landing + Setup only)', () => {
  const landing = { ...baseProps, roomImage: null, results: [], sessionConceptArchive: [], allSessionConcepts: [], selectedConceptUrl: null };
  const setup = { ...baseProps, roomImage: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1/sample-room.png', results: [], sessionConceptArchive: [], allSessionConcepts: [] };
  const renderWith = (props: typeof baseProps) =>
    render(<MemoryRouter><LanguageProvider><VisionExperience {...props} /></LanguageProvider></MemoryRouter>);

  it('renders the style marquee on the Landing state', () => {
    const { container } = renderWith(landing);
    const track = container.querySelector('.marquee-track');
    expect(track).not.toBeNull();
    expect(track?.textContent).toContain('Mid-Century'); // identical STYLES from the showcase
  });

  it('renders the style marquee on the Setup state', () => {
    const { container } = renderWith(setup);
    expect(container.querySelector('.marquee-track')).not.toBeNull();
  });

  it('does NOT render the marquee on the Results state', () => {
    const { container } = renderVE(); // baseProps → state 3 (results)
    expect(container.querySelector('.marquee-track')).toBeNull();
  });
});

describe('VisionExperience · AI-030 (cont.)', () => {
  it('treats wide landscape (aspect > 1) as landscape with object-contain', () => {
    const { container } = renderVE();
    const section = container.querySelector('section.vision-result-hero') as HTMLElement;
    const conceptImg = section.querySelector('.vision-pane-after img') as HTMLImageElement;

    Object.defineProperty(conceptImg, 'naturalWidth', { value: 1920, configurable: true });
    Object.defineProperty(conceptImg, 'naturalHeight', { value: 1080, configurable: true });
    act(() => {
      conceptImg.dispatchEvent(new Event('load', { bubbles: true }));
    });

    expect(section.getAttribute('aria-label')).toBe('Result · landscape layout');
    const beforePane = section.querySelector('.vision-pane-before') as HTMLElement;
    expect(beforePane.style.width).toBe('30%');
    const reReadImg = section.querySelector('.vision-pane-after img');
    expect(reReadImg?.className).toMatch(/object-contain/);
    expect(reReadImg?.className).not.toMatch(/object-cover/);
  });
});
