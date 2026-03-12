import { useEffect, useState } from 'react';
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
  Typography,
} from '@mui/material';
import { useSubmitOrderMutation } from '../hooks/useSubmitOrderMutation';
import type { ShellState } from '../types/store';

interface FormValues {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  limitPrice: string;
}

export function OrderTicketPanel() {
  const selectedSymbol = useSelector((s: ShellState) => s.terminal.selectedSymbol);
  const accountId = useSelector((s: ShellState) => s.auth.accountId) ?? '';
  const [successOpen, setSuccessOpen] = useState(false);

  const mutation = useSubmitOrderMutation();

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

  const orderType = watch('type');

  useEffect(() => {
    if (selectedSymbol) setValue('symbol', selectedSymbol);
  }, [selectedSymbol, setValue]);

  const onSubmit = (data: FormValues) => {
    const qty = parseInt(data.quantity, 10);
    const lp = data.type === 'LIMIT' && data.limitPrice !== '' ? parseFloat(data.limitPrice) : undefined;

    mutation.mutate(
      {
        idempotencyKey: crypto.randomUUID(),
        accountId,
        symbol: data.symbol,
        side: data.side,
        type: data.type,
        quantity: qty,
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Order Ticket
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxWidth: 360 }}
        >
          {/* Symbol */}
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              {...register('symbol', {
                required: 'Symbol is required',
                pattern: { value: /^[A-Z0-9]+$/, message: 'Symbols must be uppercase letters/digits' },
              })}
              label="Symbol"
              placeholder="e.g. AAPL"
              fullWidth
              disabled={mutation.isPending}
              error={!!errors.symbol}
              helperText={errors.symbol?.message}
              inputProps={{ 'aria-label': 'Symbol' }}
              onBlur={(e) => setValue('symbol', e.target.value.toUpperCase())}
            />
          </Box>

          {/* Side */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Side
            </Typography>
            <Controller
              name="side"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  {...field}
                  exclusive
                  fullWidth
                  size="small"
                  disabled={mutation.isPending}
                  aria-label="Order side"
                  onChange={(_, v) => { if (v) field.onChange(v); }}
                >
                  <ToggleButton
                    value="BUY"
                    aria-label="Buy"
                    sx={{ '&.Mui-selected': { color: 'trading.uptick', borderColor: 'trading.uptick' } }}
                  >
                    BUY
                  </ToggleButton>
                  <ToggleButton
                    value="SELL"
                    aria-label="Sell"
                    sx={{ '&.Mui-selected': { color: 'trading.downtick', borderColor: 'trading.downtick' } }}
                  >
                    SELL
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>

          {/* Type */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Type
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
                  <ToggleButton value="MARKET" aria-label="Market order">MKT</ToggleButton>
                  <ToggleButton value="LIMIT" aria-label="Limit order">LMT</ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          </Box>

          {/* Quantity */}
          <Box>
            <TextField
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 1, message: 'Must be at least 1' },
                validate: (v) => Number.isInteger(parseFloat(v)) || 'Must be a whole number',
              })}
              label="Quantity"
              type="number"
              fullWidth
              disabled={mutation.isPending}
              error={!!errors.quantity}
              helperText={errors.quantity?.message}
              inputProps={{ min: 1, step: 1, 'aria-label': 'Quantity' }}
            />
          </Box>

          {/* Limit Price */}
          {orderType === 'LIMIT' && (
            <Box>
              <TextField
                {...register('limitPrice', {
                  required: orderType === 'LIMIT' ? 'Limit price required' : false,
                  min: { value: 0.01, message: 'Must be positive' },
                })}
                label="Limit Price"
                type="number"
                fullWidth
                disabled={mutation.isPending}
                error={!!errors.limitPrice}
                helperText={errors.limitPrice?.message}
                inputProps={{ min: 0.01, step: 0.01, 'aria-label': 'Limit price' }}
              />
            </Box>
          )}

          {/* Submit */}
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={mutation.isPending}
              startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Order'}
            </Button>
            {mutation.isError && (
              <Alert severity="error" sx={{ mt: 1 }} role="alert">
                {mutation.error instanceof Error ? mutation.error.message : 'Request failed — try again'}
              </Alert>
            )}
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={successOpen}
        autoHideDuration={4000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message="Order submitted successfully"
      />
    </Box>
  );
}
