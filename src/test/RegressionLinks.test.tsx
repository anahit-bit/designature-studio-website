import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StudioPage from '../components/StudioPage';
import { LanguageProvider } from '../LanguageContext';
import { AuthProvider } from '../AuthContext';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthProvider>{ui}</AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
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

    fireEvent.click(screen.getAllByText(/Let's Talk/i)[0]);

    // After I-016, the click goes through trackCalendly() which fires a tracker POST
    // then opens the tab with noopener+noreferrer (security best practice).
    expect(openSpy).toHaveBeenCalledWith(
      'https://calendly.com/hello-designature/quick-conversation',
      '_blank',
      'noopener,noreferrer'
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
          // I-021a — body includes the source slug for /admin attribution.
          body: JSON.stringify({ email: 'qa@example.com', source: 'home_footer' }),
        })
      );
    });
  });

  it('studio contact form posts to /api/contact (EmailJS replaced)', async () => {
    renderWithProvider(<StudioPage />);

    fireEvent.change(screen.getByPlaceholderText(/Anahit Ghasabyan/i), {
      target: { value: 'QA User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@email\.com/i), {
      target: { value: 'qa@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rooms, timeline/i), {
      target: { value: 'Regression run message' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/contact',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

