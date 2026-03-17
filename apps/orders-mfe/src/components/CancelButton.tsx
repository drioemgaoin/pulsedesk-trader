import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Tooltip,
  CancelIcon,
} from '@pulsedesk/ui';
import { useCancelOrderMutation } from '../hooks/useCancelOrderMutation';

export interface CancelButtonProps {
  orderId: string;
  symbol: string;
  quantity: number;
}

export function CancelButton({ orderId, symbol, quantity }: CancelButtonProps) {
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const mutation = useCancelOrderMutation();

  function handleConfirm() {
    setOpen(false);
    mutation.mutate(orderId, {
      onError: (err) => setErrorMsg(err.message || 'Failed to cancel order'),
    });
  }

  return (
    <>
      <Tooltip title="Cancel order">
        <IconButton
          size="small"
          aria-label={`cancel order ${orderId}`}
          onClick={() => setOpen(true)}
        >
          <CancelIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs">
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          Cancel order for {symbol} × {quantity}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Keep</Button>
          <Button color="error" variant="contained" onClick={handleConfirm}>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg('')}
        message={errorMsg}
      />
    </>
  );
}
