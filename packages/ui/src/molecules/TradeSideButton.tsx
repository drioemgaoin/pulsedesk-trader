import { ToggleButton, type ToggleButtonProps } from '../atoms';
import { tradeSideToggleSx } from '../tokens';

export interface TradeSideButtonProps extends Omit<ToggleButtonProps, 'value'> {
  side: 'BUY' | 'SELL';
}

export function TradeSideButton({ side, sx, children, ...props }: TradeSideButtonProps) {
  return (
    <ToggleButton
      value={side}
      aria-label={side === 'BUY' ? 'Buy' : 'Sell'}
      sx={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.06em', ...tradeSideToggleSx(side), ...sx }}
      {...props}
    >
      {children ?? side}
    </ToggleButton>
  );
}
