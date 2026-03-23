import { useEffect, useRef, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
  MenuIcon,
  PulsingChip,
  StatCell,
} from "@pulsedesk/ui";
import type { MarketTick, WsStatus } from "../hooks/useMarketStream";

/** Compact volume: 5 000 000 → 5.0M, 125 000 → 125K */
function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return v.toString();
}

export interface TickerStripProps {
  tick: MarketTick | null;
  status: WsStatus;
  showWatchlistToggle: boolean;
  onToggleWatchlist: () => void;
}

/**
 * Top instrument strip — shows the selected symbol's last price, bid/ask,
 * spread, volume, and stream status.
 */
export function TickerStrip({
  tick,
  status,
  showWatchlistToggle,
  onToggleWatchlist,
}: TickerStripProps) {
  const prevLastRef = useRef<number | null>(null);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!tick) return;
    if (prevLastRef.current !== null && tick.last !== prevLastRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDir(tick.last > prevLastRef.current ? "up" : "down");
    }
    prevLastRef.current = tick.last;
  }, [tick]);

  const spread = tick ? (tick.ask - tick.bid).toFixed(2) : null;
  const isStale = status === "reconnecting";
  const isConnecting = status === "connecting";

  const priceColorSx =
    dir === "up"
      ? "trading.uptick"
      : dir === "down"
        ? "trading.downtick"
        : "text.primary";

  return (
    <Box
      sx={{
        px: 2,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "var(--pd-bg-canvas)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        flexShrink: 0,
        minHeight: 52,
        py: 0,
      }}
    >
      {showWatchlistToggle && (
        <Tooltip title="Toggle watchlist">
          <IconButton
            size="small"
            onClick={onToggleWatchlist}
            aria-label="toggle watchlist"
            sx={{ mr: 1 }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {tick ? (
        <>
          {/* Symbol + last price */}
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: 2,
              flexShrink: 0,
              pr: 3,
              pl: 1.5,
              py: 1.5,
              ml: -0.5,
              borderLeft: "3px solid",
              borderLeftColor: "var(--pd-accent-primary)",
            }}
          >
            <Typography
              sx={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.01em", color: "text.primary", lineHeight: 1 }}
            >
              {tick.symbol}
            </Typography>
            <Typography
              component="span"
              fontWeight={700}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${tick.symbol} last price ${tick.last.toFixed(2)}`}
              sx={{
                fontVariantNumeric: "tabular-nums",
                color: priceColorSx,
                transition: "color 0.6s",
                lineHeight: 1,
                fontSize: "1.375rem",
                letterSpacing: "-0.01em",
              }}
            >
              {tick.last.toFixed(2)}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 2.5, my: 1 }} />

          {/* Bid / Ask */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            <StatCell
              label="Bid"
              value={tick.bid.toFixed(2)}
              tooltip="Highest price a buyer is currently willing to pay"
              tooltipPlacement="bottom"
            />
            <StatCell
              label="Ask"
              value={tick.ask.toFixed(2)}
              tooltip="Lowest price a seller is currently willing to accept"
              tooltipPlacement="bottom"
            />
          </Box>

          {/* Spread + Volume — hidden on narrow */}
          <Box
            sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 3, flexShrink: 0, ml: 3 }}
          >
            <Divider orientation="vertical" flexItem />
            <StatCell
              label="Spread"
              value={spread ?? "—"}
              tooltip="Cost to trade — difference between ask and bid prices. Lower is better."
              tooltipPlacement="bottom"
            />
            <StatCell
              label="Volume"
              value={fmtVol(tick.volume)}
              tooltip="Total number of shares traded today"
              tooltipPlacement="bottom"
            />
          </Box>
        </>
      ) : isConnecting ? (
        <Skeleton width={280} height={28} />
      ) : (
        <Typography variant="body2" color="text.disabled">
          Select a symbol from the watchlist
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      {isStale && <PulsingChip label="RECONNECTING" color="warning" />}
    </Box>
  );
}
