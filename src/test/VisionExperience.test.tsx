import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import VisionExperience from '../components/VisionExperience';

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
  validationError: null,
  error: null,
  setError: () => {},
  isLightboxOpen: false,
  setIsLightboxOpen: () => {},
  translateStyle: (s: string) => s,
};

describe('VisionExperience · AI-030 adaptive result hero', () => {
  it('defaults to landscape mode (30/70, object-cover, 78vh) before the concept image loads', () => {
    const { container } = render(<VisionExperience {...baseProps} />);
    const section = container.querySelector('section.vision-result-hero') as HTMLElement | null;
    expect(section).not.toBeNull();
    expect(section!.getAttribute('aria-label')).toBe('Result · landscape layout');
    expect(section!.style.height).toBe('78vh');
    expect(section!.style.aspectRatio).toBe('');

    const beforePane = section!.querySelector('.vision-pane-before') as HTMLElement;
    const afterPane = section!.querySelector('.vision-pane-after') as HTMLElement;
    expect(beforePane.style.width).toBe('30%');
    expect(afterPane.style.width).toBe('70%');

    const conceptImg = afterPane.querySelector('img');
    expect(conceptImg?.className).toMatch(/object-cover/);
    expect(conceptImg?.className).not.toMatch(/object-contain/);
  });

  it('switches to portrait mode (50/50, object-contain, explicit width/height) when concept image is portrait', () => {
    const { container } = render(<VisionExperience {...baseProps} />);
    const section = container.querySelector('section.vision-result-hero') as HTMLElement;
    const conceptImg = section.querySelector('.vision-pane-after img') as HTMLImageElement;

    // Simulate a portrait image load: naturalWidth=1080, naturalHeight=1920 → aspect 0.5625.
    Object.defineProperty(conceptImg, 'naturalWidth', { value: 1080, configurable: true });
    Object.defineProperty(conceptImg, 'naturalHeight', { value: 1920, configurable: true });
    act(() => {
      conceptImg.dispatchEvent(new Event('load', { bubbles: true }));
    });

    expect(section.getAttribute('aria-label')).toBe('Result · portrait layout');
    // AI-030f: portrait uses explicit calc()/min() width + height + maxWidth: 100vw
    // (not aspectRatio + maxHeight, which collapses to landscape when combined with
    // w-full). The section is centered with the Tailwind `mx-auto` class rather than
    // inline margins. jsdom 27's CSS parser accepts min() inside calc() but is
    // inconsistent about top-level min(), so the most reliable inline-style check
    // is the width expression. The class + wrapper assertions confirm the rest.
    const styleAttr = section.getAttribute('style') ?? '';
    expect(styleAttr).toMatch(/width:\s*calc\(min\(90vh[\s\S]*?\)\s*\*\s*0\.5625\)/);
    expect(styleAttr).toMatch(/max-width:\s*100vw/);
    expect(section.className).toMatch(/\bmx-auto\b/);
    expect(section.className).not.toMatch(/\bw-full\b/);

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
    const { container } = render(<VisionExperience {...baseProps} />);
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

  it('treats wide landscape (aspect > 1) as landscape', () => {
    const { container } = render(<VisionExperience {...baseProps} />);
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
  });
});
