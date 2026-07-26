import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../LanguageContext';

// Exercises the in-app navigation guard (LanguageContext.setNavGuard / confirmNav):
// while a guard message is registered — as AIConceptsPage does during an AI Vision
// generation — leaving the current page must ask window.confirm and respect the answer.
const Probe = () => {
  const { currentPage, navigateTo, setNavGuard } = useLanguage();
  return (
    <div>
      <span data-testid="page">{currentPage}</span>
      <button onClick={() => setNavGuard('generation in progress — leave?')}>guard-on</button>
      <button onClick={() => setNavGuard(null)}>guard-off</button>
      <button onClick={() => navigateTo('portfolio')}>go-portfolio</button>
      <button onClick={() => navigateTo('ai-concepts')}>go-samepage</button>
    </div>
  );
};

const renderProbe = (initial = '/') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    </MemoryRouter>,
  );

afterEach(() => vi.restoreAllMocks());

describe('LanguageContext navigation guard', () => {
  it('navigates freely when no guard is set (never prompts)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderProbe('/');
    fireEvent.click(screen.getByText('go-portfolio'));
    expect(screen.getByTestId('page')).toHaveTextContent('portfolio');
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('blocks navigation when the guard is set and the user cancels', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderProbe('/');
    fireEvent.click(screen.getByText('guard-on'));
    fireEvent.click(screen.getByText('go-portfolio'));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('page')).toHaveTextContent('home'); // stayed put
  });

  it('allows navigation when the guard is set but the user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderProbe('/');
    fireEvent.click(screen.getByText('guard-on'));
    fireEvent.click(screen.getByText('go-portfolio'));
    expect(screen.getByTestId('page')).toHaveTextContent('portfolio');
  });

  it('does not prompt when re-selecting the current page', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderProbe('/ai-concepts');
    fireEvent.click(screen.getByText('guard-on'));
    fireEvent.click(screen.getByText('go-samepage')); // already on /ai-concepts
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('page')).toHaveTextContent('ai-concepts');
  });

  it('stops guarding once cleared', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderProbe('/');
    fireEvent.click(screen.getByText('guard-on'));
    fireEvent.click(screen.getByText('guard-off'));
    fireEvent.click(screen.getByText('go-portfolio'));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('page')).toHaveTextContent('portfolio');
  });
});
