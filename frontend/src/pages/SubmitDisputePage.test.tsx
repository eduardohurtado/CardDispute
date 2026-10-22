import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { DISPUTES_PATH } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';

const ROUTE = '/disputes/new';

const COFFEE_SHOP = 'a1000000-0000-4000-8000-000000000001';
const FUEL_STOP = 'a1000000-0000-4000-8000-000000000003';
const SUPERMARKET = 'a1000000-0000-4000-8000-000000000008';
const SUPERMARKET_DUPLICATE = 'a1000000-0000-4000-8000-000000000009';
const PENDING_TAXI = 'a1000000-0000-4000-8000-000000000010';
const EXPIRED_BOOKSHOP = 'a1000000-0000-4000-8000-000000000011';

async function choose(transactionId: string, candidateId: string) {
  await userEvent.selectOptions(await screen.findByLabelText('Transaction'), transactionId);
  await userEvent.selectOptions(screen.getByLabelText('Possible duplicate'), candidateId);
}

function submit() {
  return userEvent.click(screen.getByRole('button', { name: 'Submit dispute' }));
}

describe('SubmitDisputePage', () => {
  it('shows the form with the demonstration notice', async () => {
    renderWithProviders({ route: ROUTE });

    expect(
      await screen.findByRole('heading', { name: 'Report a possible duplicate card charge' }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Transaction')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toHaveValue('POSSIBLE_DUPLICATE');
    expect(screen.getByText('Demonstration only; no actual refunds.')).toBeInTheDocument();
  });

  it('offers only posted charges', async () => {
    renderWithProviders({ route: ROUTE });

    const select = await screen.findByLabelText('Transaction');

    expect(within(select).getAllByRole('option', { name: /Supermercado Éxito/ })).toHaveLength(2);
    expect(select.querySelector(`option[value="${PENDING_TAXI}"]`)).toBeNull();
  });

  it('keeps the duplicate list disabled until a charge is chosen', async () => {
    renderWithProviders({ route: ROUTE });

    await screen.findByLabelText('Transaction');

    expect(screen.getByLabelText('Possible duplicate')).toBeDisabled();
  });

  it('lists same-amount charges first and leaves out the chosen charge', async () => {
    renderWithProviders({ route: ROUTE });

    await userEvent.selectOptions(await screen.findByLabelText('Transaction'), SUPERMARKET);
    const candidates = screen.getByLabelText('Possible duplicate');

    expect(candidates.querySelector(`option[value="${SUPERMARKET}"]`)).toBeNull();
    const sameAmount = within(candidates).getByRole('group', { name: 'Same amount' });
    expect(within(sameAmount).getAllByRole('option')).toHaveLength(1);
    expect(within(sameAmount).getByRole('option')).toHaveValue(SUPERMARKET_DUPLICATE);
  });

  it('asks for both charges before sending', async () => {
    renderWithProviders({ route: ROUTE });

    await screen.findByLabelText('Transaction');
    await submit();

    expect(screen.getByText('Choose the charge you want to dispute.')).toBeInTheDocument();
    expect(screen.getByText('Choose the charge that looks like a duplicate.')).toBeInTheDocument();
    expect(screen.getByLabelText('Transaction')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits the dispute and opens the new case', async () => {
    const { router } = renderWithProviders({ route: ROUTE });

    await choose(SUPERMARKET, SUPERMARKET_DUPLICATE);
    await userEvent.type(screen.getByLabelText('Additional details (optional)'), 'Charged twice.');
    await submit();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/disputes/d4000000-0000-4000-8000-000000000001');
    });
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Dispute submitted');
    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument();
  });

  it('explains when one of the charges already has an open dispute', async () => {
    renderWithProviders({ route: ROUTE });

    await choose(FUEL_STOP, COFFEE_SHOP);
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is already an open dispute for one of these charges.',
    );
  });

  it('shows the business reason when the charge is not eligible', async () => {
    renderWithProviders({ route: ROUTE });

    await choose(EXPIRED_BOOKSHOP, COFFEE_SHOP);
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Transactions can only be disputed within 60 days of posting',
    );
  });

  it('reports an unexpected failure in a toast and keeps the values', async () => {
    server.use(
      http.post(DISPUTES_PATH, () =>
        HttpResponse.json({ type: 'about:blank', title: 'Boom', status: 500 }, { status: 500 }),
      ),
    );
    const { router } = renderWithProviders({ route: ROUTE });

    await choose(SUPERMARKET, SUPERMARKET_DUPLICATE);
    await submit();

    await waitFor(() => {
      expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Boom');
    });
    expect(screen.getByLabelText('Transaction')).toHaveValue(SUPERMARKET);
    expect(screen.getByLabelText('Possible duplicate')).toHaveValue(SUPERMARKET_DUPLICATE);
    expect(router.state.location.pathname).toBe(ROUTE);
  });

  it('shows an error state when the charges cannot be loaded', async () => {
    server.use(
      http.get(/\/api\/v1\/transactions/, () =>
        HttpResponse.json({ type: 'about:blank', title: 'Boom', status: 500 }, { status: 500 }),
      ),
    );

    renderWithProviders({ route: ROUTE });

    expect(await screen.findByText('We could not load your charges')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
