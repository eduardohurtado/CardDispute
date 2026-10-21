import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { DISPUTE_PATH } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';

const RESOLVED_CASE = '/disputes/b2000000-0000-4000-8000-000000000001';
const PENDING_CASE = '/disputes/b2000000-0000-4000-8000-000000000002';
const FOREIGN_CASE = '/disputes/b2000000-0000-4000-8000-000000000006';

describe('DisputeDetailPage', () => {
  it('shows the sections of a case', async () => {
    renderWithProviders({ route: RESOLVED_CASE });

    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Decision' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Case details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
  });

  it('shows the progress of the case', async () => {
    renderWithProviders({ route: RESOLVED_CASE });

    expect(await screen.findByRole('list', { name: 'Case progress' })).toBeInTheDocument();
    expect(screen.getByText('Analyst review')).toBeInTheDocument();
  });

  it('shows the decision of a resolved case', async () => {
    renderWithProviders({ route: RESOLVED_CASE });

    expect(
      await screen.findByText('Same merchant, same amount and same currency within one hour.'),
    ).toBeInTheDocument();
  });

  it('shows a placeholder while the decision is pending', async () => {
    renderWithProviders({ route: PENDING_CASE });

    expect(await screen.findByText('Decision pending')).toBeInTheDocument();
  });

  it('shows the history of the case', async () => {
    renderWithProviders({ route: RESOLVED_CASE });

    expect(await screen.findByRole('list', { name: 'Case timeline' })).toBeInTheDocument();
    expect(screen.getByText('Case created')).toBeInTheDocument();
    expect(screen.getByText('Submitted → In review')).toBeInTheDocument();
  });

  it('shows the transaction of the case', async () => {
    renderWithProviders({ route: RESOLVED_CASE });

    expect(await screen.findByRole('heading', { name: 'Suspected duplicate' })).toBeInTheDocument();
    expect(screen.getAllByText('COP 35,000')).toHaveLength(2);
  });

  it('shows a not found state for an unknown case', async () => {
    renderWithProviders({ route: '/disputes/does-not-exist' });

    expect(await screen.findByText('Case not found')).toBeInTheDocument();
  });

  it('shows a not found state for a case of another customer', async () => {
    renderWithProviders({ route: FOREIGN_CASE });

    expect(await screen.findByText('Case not found')).toBeInTheDocument();
  });

  it('shows an error state when the case cannot be loaded', async () => {
    server.use(
      http.get(DISPUTE_PATH, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Boom', status: 500 },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders({ route: RESOLVED_CASE });

    expect(await screen.findByText('We could not load this case')).toBeInTheDocument();
  });

  it('links back to the case list', async () => {
    renderWithProviders({ route: RESOLVED_CASE });

    expect(await screen.findByRole('link', { name: 'Back to My Disputes' })).toHaveAttribute(
      'href',
      '/disputes',
    );
  });
});
