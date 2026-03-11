import { useState } from 'react';
import { z } from 'zod';
import type { ApiClient } from '../../api/client';

const schema = z
  .object({
    symbol: z.string().min(1).regex(/^[A-Z0-9]+$/),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['MARKET', 'LIMIT']),
    quantity: z.number().int().positive(),
    limitPrice: z.number().positive().optional(),
  })
  .refine(
    (d) => d.type === 'MARKET' || (d.limitPrice !== undefined && d.limitPrice > 0),
    {
      message: 'Limit price required for LIMIT orders',
      path: ['limitPrice'],
    },
  );

type FormData = z.infer<typeof schema>;

interface OrderTicketPanelProps {
  client: ApiClient;
  accountId: string;
}

const defaultForm = {
  symbol: '',
  side: 'BUY' as 'BUY' | 'SELL',
  type: 'MARKET' as 'MARKET' | 'LIMIT',
  quantity: '',
  limitPrice: '',
};

export function OrderTicketPanel({ client, accountId }: OrderTicketPanelProps) {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  function validate(): FormData | null {
    const raw = {
      symbol: form.symbol,
      side: form.side,
      type: form.type,
      quantity: form.quantity === '' ? 0 : parseInt(form.quantity, 10),
      limitPrice:
        form.type === 'LIMIT' && form.limitPrice !== ''
          ? parseFloat(form.limitPrice)
          : undefined,
    };

    const result = schema.safeParse(raw);
    if (!result.success) {
      const errors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return null;
    }
    setFieldErrors({});
    return result.data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const data = validate();
    if (!data) return;

    setSubmitting(true);
    try {
      await client.submitOrder({
        idempotencyKey: crypto.randomUUID(),
        accountId,
        symbol: data.symbol,
        side: data.side,
        type: data.type,
        quantity: data.quantity,
        limitPrice: data.limitPrice,
      });
      setForm(defaultForm);
      setFieldErrors({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed — try again';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const isFormValid =
    form.symbol.trim() !== '' &&
    /^[A-Z0-9]+$/.test(form.symbol) &&
    form.quantity !== '' &&
    parseInt(form.quantity, 10) > 0;

  const inputBase =
    'w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50';

  return (
    <div className="flex flex-col h-full">
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order Ticket</h2>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <form onSubmit={(e) => { void handleSubmit(e); }} noValidate className="grid grid-cols-2 gap-3 max-w-md">
          {/* Symbol */}
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1" htmlFor="ot-symbol">Symbol</label>
            <input
              id="ot-symbol"
              type="text"
              className={inputBase}
              placeholder="e.g. AAPL"
              value={form.symbol}
              disabled={submitting}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              onBlur={(e) =>
                setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))
              }
            />
            {fieldErrors['symbol'] && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors['symbol']}</p>
            )}
          </div>

          {/* Side */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Side</label>
            <div className="flex" role="group" aria-label="Order side">
              <button
                type="button"
                disabled={submitting}
                onKeyDown={(e) => e.key === ' ' && setForm((f) => ({ ...f, side: 'BUY' }))}
                onClick={() => setForm((f) => ({ ...f, side: 'BUY' }))}
                aria-pressed={form.side === 'BUY'}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-l border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
                  form.side === 'BUY'
                    ? 'bg-green-900/50 border-green-700 text-green-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                disabled={submitting}
                onKeyDown={(e) => e.key === ' ' && setForm((f) => ({ ...f, side: 'SELL' }))}
                onClick={() => setForm((f) => ({ ...f, side: 'SELL' }))}
                aria-pressed={form.side === 'SELL'}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-r border-t border-b border-r transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
                  form.side === 'SELL'
                    ? 'bg-red-900/50 border-red-700 text-red-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type</label>
            <div className="flex" role="group" aria-label="Order type">
              <button
                type="button"
                disabled={submitting}
                onKeyDown={(e) => e.key === ' ' && setForm((f) => ({ ...f, type: 'MARKET', limitPrice: '' }))}
                onClick={() => setForm((f) => ({ ...f, type: 'MARKET', limitPrice: '' }))}
                aria-pressed={form.type === 'MARKET'}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-l border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
                  form.type === 'MARKET'
                    ? 'bg-blue-900/50 border-blue-700 text-blue-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                MARKET
              </button>
              <button
                type="button"
                disabled={submitting}
                onKeyDown={(e) => e.key === ' ' && setForm((f) => ({ ...f, type: 'LIMIT' }))}
                onClick={() => setForm((f) => ({ ...f, type: 'LIMIT' }))}
                aria-pressed={form.type === 'LIMIT'}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-r border-t border-b border-r transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
                  form.type === 'LIMIT'
                    ? 'bg-blue-900/50 border-blue-700 text-blue-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1" htmlFor="ot-quantity">Quantity</label>
            <input
              id="ot-quantity"
              type="number"
              min="1"
              step="1"
              className={inputBase}
              placeholder="0"
              value={form.quantity}
              disabled={submitting}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
            {fieldErrors['quantity'] && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors['quantity']}</p>
            )}
          </div>

          {/* Limit Price (only when LIMIT) */}
          {form.type === 'LIMIT' && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1" htmlFor="ot-limit-price">Limit Price</label>
              <input
                id="ot-limit-price"
                type="number"
                min="0.01"
                step="0.01"
                className={inputBase}
                placeholder="0.00"
                value={form.limitPrice}
                disabled={submitting}
                onChange={(e) => setForm((f) => ({ ...f, limitPrice: e.target.value }))}
              />
              {fieldErrors['limitPrice'] && (
                <p className="text-xs text-red-400 mt-1">{fieldErrors['limitPrice']}</p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="col-span-2">
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="w-full px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  Submitting…
                </span>
              ) : (
                'Submit Order'
              )}
            </button>
            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
