import { Box, Paper, Typography, TrendingUpIcon, useTheme } from "@pulsedesk/ui";

export interface FillEvent {
  symbol: string;
  side: "BUY" | "SELL";
  filledQuantity: number;
  fillPrice: number;
}

export interface FillToastProps {
  fill: FillEvent;
}

/**
 * Snackbar content for a filled order notification.
 * Rendered inside a <Snackbar> in TradingTerminalPage.
 */
export function FillToast({ fill }: FillToastProps) {
  const theme = useTheme();
  return (
    <Paper
      elevation={4}
      sx={{
        px: 2.5,
        py: 1.5,
        borderLeft: `3px solid ${theme.palette.success.main}`,
        minWidth: 260,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <TrendingUpIcon sx={{ fontSize: 18, color: "success.main", flexShrink: 0 }} />
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          Order Filled
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {fill.symbol} × {fill.filledQuantity} {fill.side} FILLED at ${fill.fillPrice}
        </Typography>
      </Box>
    </Paper>
  );
}
