import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { renderWithProviders } from './test-utils/renderWithProviders';
import OrdersPage from './OrdersPage';
import type { OrderResponseV1 } from './api/types';

const makeOrder = (overrides: Partial<OrderResponseV1> = {}): OrderResponseV1 => ({
  id: 'ord-001',
  commandId: 'cmd-001',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: 'BUY',
  type: 'MARKET',
  quantity: 10,
  status: 'FILLED',
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T10:01:00.000Z',
  ...overrides,
});

function withOrders(orders: OrderResponseV1[], total?: number) {
  server.use(
    http.get('http://localhost:3000/api/v1/orders', () =>
      HttpResponse.json({
        orders,
        pagination: { limit: 25, offset: 0, total: total ?? orders.length },
      }),
    ),
  );
}

beforeEach(() => { vi.clearAllMocks(); });

// ── Empty state ──────────────────────────────────────────────────────────────
describe('Given no orders', () => {
  it('When data loads, Should show empty state message', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() =>
      expect(screen.getByText(/no orders match/i)).toBeInTheDocument(),
    );
  });

  it('When no active filters, Should NOT show clear filters button', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText(/no orders match/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

// ── Orders render ────────────────────────────────────────────────────────────
describe('Given orders exist', () => {
  beforeEach(() => {
    withOrders([
      makeOrder({ id: 'ord-001', symbol: 'AAPL', side: 'BUY', status: 'FILLED' }),
      makeOrder({ id: 'ord-002', symbol: 'TSLA', side: 'SELL', status: 'PENDING' }),
    ]);
  });

  it('When data loads, Should render order rows in the table', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
    expect(screen.getByText('TSLA')).toBeInTheDocument();
  });

  it('When data loads, Should show status chip with correct label', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText('FILLED')).toBeInTheDocument());
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('When PENDING row rendered, Should show cancel button', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText('TSLA')).toBeInTheDocument());
    expect(screen.getByLabelText(/cancel order ord-002/i)).toBeInTheDocument();
  });

  it('When FILLED row rendered, Should NOT show cancel button for that row', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
    expect(screen.queryByLabelText(/cancel order ord-001/i)).not.toBeInTheDocument();
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────
describe('Given 30 orders (more than one page)', () => {
  it('When rendered, Should show pagination with correct page count info', async () => {
    withOrders([makeOrder()], 30);
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
    // TablePagination shows "1–25 of 30" style text
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });
});

// ── Cancel mutation — optimistic update ──────────────────────────────────────
describe('Given a PENDING order', () => {
  beforeEach(() => {
    withOrders([makeOrder({ id: 'ord-cancel', status: 'PENDING', symbol: 'AAPL', quantity: 10 })]);
  });

  it('When cancel confirmed, Should open dialog and call cancel API', async () => {
    let cancelCalled = false;
    server.use(
      http.post('http://localhost:3000/api/v1/orders/ord-cancel/cancel', () => {
        cancelCalled = true;
        return HttpResponse.json({ ...makeOrder({ id: 'ord-cancel', status: 'CANCELLED' }) });
      }),
    );

    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByLabelText(/cancel order ord-cancel/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/cancel order ord-cancel/i));

    await waitFor(() =>
      expect(screen.getByRole('dialog')).toBeInTheDocument(),
    );
    expect(screen.getByText(/cancel order for AAPL × 10/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => expect(cancelCalled).toBe(true));
  });

  it('When cancel dialog dismissed, Should close without calling API', async () => {
    let cancelCalled = false;
    server.use(
      http.post('http://localhost:3000/api/v1/orders/ord-cancel/cancel', () => {
        cancelCalled = true;
        return HttpResponse.json({});
      }),
    );

    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByLabelText(/cancel order ord-cancel/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/cancel order ord-cancel/i));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /keep/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(cancelCalled).toBe(false);
  });
});

// ── Row expand ───────────────────────────────────────────────────────────────
describe('Given an order row', () => {
  beforeEach(() => {
    withOrders([
      makeOrder({
        id: 'full-uuid-12345678-abcd',
        commandId: 'cmd-key-xyz',
        limitPrice: 160.47,
      }),
    ]);
  });

  it('When expand button clicked, Should show row detail with full IDs', async () => {
    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('expand row'));

    await waitFor(() =>
      expect(screen.getByText('full-uuid-12345678-abcd')).toBeInTheDocument(),
    );
    expect(screen.getByText('cmd-key-xyz')).toBeInTheDocument();
    expect(screen.getByText('$160.47')).toBeInTheDocument();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────
describe('Given the API returns an error', () => {
  it('When data fails to load, Should show error alert', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<OrdersPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument();
  });
});

// ── Filter — clear CTA ───────────────────────────────────────────────────────
describe('Given active filters with no results', () => {
  it('When rendered, Should show clear filters button', async () => {
    renderWithProviders(<OrdersPage />);

    // Open the drawer (filter panel is in Drawer on small screens in jsdom)
    await waitFor(() => expect(screen.getByLabelText('open filters')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('open filters'));

    // Click FILLED chip inside the drawer
    await waitFor(() => expect(screen.getByRole('button', { name: 'FILLED' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'FILLED' }));

    // Close the drawer so the main content is no longer aria-hidden
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    // Empty result + active filter → clear filters CTA visible
    await waitFor(() =>
      expect(screen.getByText(/clear filters/i)).toBeInTheDocument(),
    );
  });
});
