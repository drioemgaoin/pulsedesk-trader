import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSubmitOrderMutation } from '../hooks/useSubmitOrderMutation';
import { usePositionsQuery } from '../hooks/usePositionsQuery';
import type { ShellState } from '../types/store';
import type { WsStatus } from '../hooks/useMarketStream';

interface FormValues {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  limitPrice: string;
}

interface OrderTicketPanelProps {
  streamStatus: WsStatus;
  lastPrice: number | null;
}

export interface OrderTicketPanelHandle {
  focusSymbol(): void;
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const OrderTicketPanel = forwardRef<OrderTicketPanelHandle, OrderTicketPanelProps>(
  function OrderTicketPanel({ streamStatus, lastPrice }, ref) {
    const selectedSymbol = useSelector((s: ShellState) => s.terminal.selectedSymbol);
    const accountId = useSelector((s: ShellState) => s.auth.accountId) ?? '';
    const [successOpen, setSuccessOpen] = useState(false);
    const symbolInputRef = useRef<HTMLInputElement>(null);

    const mutation = useSubmitOrderMutation();
    const { data: positionsData } = usePositionsQuery(accountId);

    const {
      register,
      handleSubmit,
      control,
      watch,
      reset,
      setValue,
      formState: { errors },
    } = useForm<FormValues>({
      defaultValues: { symbol: '', side: 'BUY', type: 'MARKET', quantity: '', limitPrice: '' },
    });

    const side      = watch('side');
    const orderType = watch('type');
    const symbol    = watch('symbol');
    const qtyRaw    = watch('quantity');
    const limitRaw  = watch('limitPrice');
    const isBuy     = side === 'BUY';

    useImperativeHandle(ref, () => ({
      focusSymbol: () => symbolInputRef.current?.focus(),
    }));

    useEffect(() => {
      if (selectedSymbol) setValue('symbol', selectedSymbol);
    }, [selectedSymbol, setValue]);

    const onSubmit = (data: FormValues) => {
      const qty = parseInt(data.quantity, 10);
      const lp  = data.type === 'LIMIT' && data.limitPrice !== '' ? parseFloat(data.limitPrice) : undefined;

      mutation.mutate(
        {
          idempotencyKey: crypto.randomUUID(),
          accountId,
          symbol: data.symbol,
          side:   data.side,
          type:   data.type,
          quantity:   qty,
          limitPrice: lp,
        },
        {
          onSuccess: () => {
            reset({ symbol: data.symbol, side: 'BUY', type: 'MARKET', quantity: '', limitPrice: '' });
            setSuccessOpen(true);
          },
        },
      );
    };

    // Current position for the selected symbol
    const currentPosition = positionsData?.positions.find((p) => p.symbol === symbol);
    const positionQty = currentPosition ? Math.abs(currentPosition.quantity) : 0;
    const positionLabel = currentPosition
      ? `${positionQty} share${positionQty !== 1 ? 's' : ''} (${currentPosition.quantity > 0 ? 'long' : 'short'}) · ${currentPosition.unrealizedPnl >= 0 ? '+' : ''}${fmtUsd(currentPosition.unrealizedPnl)}`
      : null;

    // Estimated notional value
    const qty = parseFloat(qtyRaw) || 0;
    const priceForNotional =
      orderType === 'LIMIT' ? (parseFloat(limitRaw) || 0) : (lastPrice ?? 0);
    const notional = qty > 0 && priceForNotional > 0 ? qty * priceForNotional : null;

    const isStale = streamStatus === 'reconnecting' || streamStatus === 'connecting';

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Panel header — live symbol + price confirmation ── */}
        <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          {selectedSymbol ? (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                {selectedSymbol}
              </Typography>
              {lastPrice !== null && (
                <Typography sx={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums', color: 'text.secondary', lineHeight: 1 }}>
                  {lastPrice.toFixed(2)}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
              Select a symbol to trade
            </Typography>
          )}
        </Box>

        {/* ── Stale price warning ── */}
        {isStale && (
          <Alert
            severity="warning"
            sx={{ mx: 2, mt: 1, py: 0.5, fontSize: '0.75rem' }}
            role="alert"
          >
            {streamStatus === 'reconnecting' ? 'Stream reconnecting — prices may be stale' : 'Connecting to market data…'}
          </Alert>
        )}

        {/* ── Scrollable form fields ── */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Box
            component="form"
            id="order-ticket-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >

            {/* BUY / SELL — prominent, color-coded */}
            <Controller
              name="side"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  {...field}
                  exclusive
                  fullWidth
                  disabled={mutation.isPending}
                  aria-label="Order side"
                  onChange={(_, v) => { if (v) field.onChange(v); }}
                  sx={{ height: 48 }}
                >
                  <ToggleButton
                    value="BUY"
                    aria-label="Buy"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '0.06em',
                      color: 'success.main',
                      borderColor: 'success.main',
                      '&:hover': { bgcolor: 'success.light', color: 'success.contrastText' },
                      '&:active': { bgcolor: 'success.main', color: 'success.contrastText' },
                      '&:hover:active': { bgcolor: 'success.dark', color: 'success.contrastText' },
                      '&.Mui-selected': {
                        bgcolor: 'success.main',
                        color: 'success.contrastText',
                        borderColor: 'success.main',
                        '&:hover': { bgcolor: 'success.light' },
                        '&:active, &:hover:active': { bgcolor: 'success.dark' },
                      },
                      '&.Mui-focusVisible': {
                        boxShadow: (t) => `0 0 0 2px ${t.palette.background.paper}, 0 0 0 4px ${t.palette.success.main}`,
                        outline: 'none',
                      },
                      '&.Mui-focusVisible:hover': {
                        boxShadow: (t) => `0 0 0 2px ${t.palette.background.paper}, 0 0 0 4px ${t.palette.success.light}`,
                      },
                    }}
                  >
                    BUY
                  </ToggleButton>
                  <ToggleButton
                    value="SELL"
                    aria-label="Sell"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '0.06em',
                      color: 'error.main',
                      borderColor: 'error.main',
                      '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                      '&:active': { bgcolor: 'error.main', color: 'error.contrastText' },
                      '&:hover:active': { bgcolor: 'error.dark', color: 'error.contrastText' },
                      '&.Mui-selected': {
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                        borderColor: 'error.main',
                        '&:hover': { bgcolor: 'error.light' },
                        '&:active, &:hover:active': { bgcolor: 'error.dark' },
                      },
                      '&.Mui-focusVisible': {
                        boxShadow: (t) => `0 0 0 2px ${t.palette.background.paper}, 0 0 0 4px ${t.palette.error.main}`,
                        outline: 'none',
                      },
                      '&.Mui-focusVisible:hover': {
                        boxShadow: (t) => `0 0 0 2px ${t.palette.background.paper}, 0 0 0 4px ${t.palette.error.light}`,
                      },
                    }}
                  >
                    SELL
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            {/* Symbol + current position badge */}
            <TextField
              {...register('symbol', {
                required: 'Symbol is required',
                pattern:  { value: /^[A-Z0-9]+$/, message: 'Uppercase letters/digits only' },
              })}
              label="Stock symbol"
              placeholder="e.g. AAPL"
              fullWidth
              disabled={mutation.isPending}
              error={!!errors.symbol}
              helperText={errors.symbol?.message ?? (positionLabel
                ? `Holding: ${positionLabel}`
                : (symbol && symbol === selectedSymbol ? 'From watchlist · edit to change' : undefined))}
              inputRef={symbolInputRef}
              inputProps={{ 'aria-label': 'Stock symbol' }}
              onBlur={(e) => setValue('symbol', e.target.value.toUpperCase())}
              FormHelperTextProps={positionLabel && !errors.symbol ? {
                sx: { color: currentPosition && currentPosition.unrealizedPnl >= 0 ? 'trading.uptick' : 'trading.downtick' },
              } : undefined}
            />

            {/* Order type */}
            <Box>
              <Typography color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.75rem' }}>
                Order Type
              </Typography>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    size="small"
                    disabled={mutation.isPending}
                    aria-label="Order type"
                    onChange={(_, v) => { if (v) field.onChange(v); }}
                  >
                    <Tooltip title="Buy or sell immediately at the current market price" placement="top">
                      <ToggleButton value="MARKET" aria-label="Market order">Market</ToggleButton>
                    </Tooltip>
                    <Tooltip title="Buy or sell only when the price reaches your specified value or better" placement="top">
                      <ToggleButton value="LIMIT" aria-label="Limit order">Limit</ToggleButton>
                    </Tooltip>
                  </ToggleButtonGroup>
                )}
              />
            </Box>

            {/* Quantity */}
            <TextField
              {...register('quantity', {
                required: 'Required',
                min:      { value: 1, message: 'Min 1' },
                validate: (v) => Number.isInteger(parseFloat(v)) || 'Whole number',
              })}
              label="Number of shares"
              type="number"
              fullWidth
              disabled={mutation.isPending}
              error={!!errors.quantity}
              helperText={errors.quantity?.message}
              inputProps={{ min: 1, step: 1, 'aria-label': 'Number of shares' }}
            />

            {/* Limit price (conditional) */}
            {orderType === 'LIMIT' && (
              <TextField
                {...register('limitPrice', {
                  required: 'Limit price required',
                  min:      { value: 0.01, message: 'Must be positive' },
                })}
                label="Limit Price"
                type="number"
                fullWidth
                disabled={mutation.isPending}
                error={!!errors.limitPrice}
                helperText={errors.limitPrice?.message}
                inputProps={{ min: 0.01, step: 0.01, 'aria-label': 'Limit price' }}
              />
            )}

            {mutation.isError && (
              <Alert severity="error" role="alert">
                {mutation.error instanceof Error ? mutation.error.message : 'Request failed — try again'}
              </Alert>
            )}
          </Box>
        </Box>

        {/* ── Sticky submit area — always visible ── */}
        <Box sx={{ px: 2, py: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
          {/* Estimated notional — helps traders sanity-check size */}
          {notional !== null && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', mb: 1 }}
              aria-live="polite"
            >
              {orderType === 'MARKET' && isStale ? '≈ ' : ''}
              Est. {fmtUsd(notional)}
              {orderType === 'MARKET' && lastPrice ? ` @ ${lastPrice.toFixed(2)} last` : ''}
            </Typography>
          )}

          <Button
            type="submit"
            form="order-ticket-form"
            variant="contained"
            fullWidth
            disabled={mutation.isPending}
            color={isBuy ? 'success' : 'error'}
            startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              height: 48,
              fontWeight: 700,
              fontSize: '0.9375rem',
              letterSpacing: '0.04em',
            }}
          >
            {mutation.isPending
              ? 'Submitting…'
              : `${isBuy ? 'Buy' : 'Sell'}${symbol ? ` ${symbol}` : ''}`}
          </Button>
        </Box>

        <Snackbar
          open={successOpen}
          autoHideDuration={4000}
          onClose={() => setSuccessOpen(false)}
          message="Order submitted successfully"
        />
      </Box>
    );
  }
);
