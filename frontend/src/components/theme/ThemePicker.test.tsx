import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '@/config/theme';
import { selectResolvedTheme } from '@/store/slices/ui/uiSlice';
import { createMatchMedia } from '@/test/matchMedia';
import { renderWithProviders } from '@/test/renderWithProviders';

const html = document.documentElement;

describe('ThemePicker', () => {
  it('sits right after the demo user menu', async () => {
    renderWithProviders({ route: '/' });

    const demoUser = await screen.findByLabelText('Demo user');
    const theme = screen.getByLabelText('Theme');

    expect(theme).toHaveValue('system');
    expect(demoUser.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('switches the page to dark and remembers the choice', async () => {
    renderWithProviders({ route: '/' });

    await userEvent.selectOptions(await screen.findByLabelText('Theme'), 'dark');

    expect(html.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('follows the OS setting with System, also when it changes', async () => {
    const os = createMatchMedia(true);
    window.matchMedia = os.matchMedia;

    const { store } = renderWithProviders({ route: '/' });
    await screen.findByLabelText('Theme');

    expect(html.dataset.theme).toBe('dark');

    act(() => os.setDark(false));

    expect(selectResolvedTheme(store.getState())).toBe('light');
    expect(html.dataset.theme).toBe('light');
  });

  it('keeps an explicit choice when the OS setting changes', async () => {
    const os = createMatchMedia(false);
    window.matchMedia = os.matchMedia;
    renderWithProviders({ route: '/' });

    await userEvent.selectOptions(await screen.findByLabelText('Theme'), 'light');
    act(() => os.setDark(true));

    expect(html.dataset.theme).toBe('light');
  });

  it('applies a saved choice on first render', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    renderWithProviders({ route: '/does-not-exist' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(html.dataset.theme).toBe('dark');
  });
});
