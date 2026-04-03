import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StudioPage from '../components/StudioPage';
import { LanguageProvider } from '../LanguageContext';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

const sendFormMock = vi.fn();
vi.mock('@emailjs/browser', () => ({
  default: {
    sendForm: (...args: unknown[]) => sendFormMock(...args),
  },
}));

describe('Regression: links and email flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    } as Response);
  });

  it('header CTA opens Calendly link', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithProvider(<Header />);

    fireEvent.click(screen.getAllByText(/Book a Conversation/i)[0]);

    expect(openSpy).toHaveBeenCalledWith(
      'https://calendly.com/designature-studio-us/free_consultation',
      '_blank'
    );
    openSpy.mockRestore();
  });

  it('footer social/contact links point to expected URLs', () => {
    renderWithProvider(<Footer />);

    expect(screen.getByText('hello@designature.studio').closest('a')).toHaveAttribute(
      'href',
      'mailto:hello@designature.studio'
    );

    expect(
      document.querySelector('a[href="https://www.facebook.com/Designature.Design.Studio"]')
    ).toBeTruthy();
    expect(
      document.querySelector('a[href="https://www.instagram.com/designature_interior/"]')
    ).toBeTruthy();
  });

  it('newsletter subscribe posts to /api/newsletter/subscribe', async () => {
    renderWithProvider(<Footer />);

    fireEvent.change(screen.getByPlaceholderText(/Your Email Address/i), {
      target: { value: 'qa@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Subscribe/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/newsletter/subscribe',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'qa@example.com', country: 'US' }),
        })
      );
    });
  });

  it('studio contact form triggers EmailJS sendForm', async () => {
    sendFormMock.mockResolvedValueOnce({});
    renderWithProvider(<StudioPage />);

    fireEvent.change(screen.getByPlaceholderText(/Your full name/i), {
      target: { value: 'QA User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/your@email.com/i), {
      target: { value: 'qa@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Living room redesign/i), {
      target: { value: 'QA Subject' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Tell us about your project/i), {
      target: { value: 'Regression run message' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    await waitFor(() => {
      expect(sendFormMock).toHaveBeenCalledTimes(1);
    });
  });
});

