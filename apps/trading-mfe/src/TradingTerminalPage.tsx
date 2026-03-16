import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  TrendingUpIcon,
  MenuIcon,
} from "@pulsedesk/ui";
import { WatchlistPanel } from "./components/WatchlistPanel";
import type { WatchlistPanelHandle } from "./components/WatchlistPanel";
import { ChartPanel } from "./components/ChartPanel";
import { OrderTicketPanel } from "./components/OrderTicketPanel";
import type { OrderTicketPanelHandle } from "./components/OrderTicketPanel";
import { BlotterPanel } from "./components/BlotterPanel";
import { useMarketStream } from "./hooks/useMarketStream";
import { useWatchlistQuery } from "./hooks/useWatchlistQuery";
import { setConnectionStatus } from "./store/terminalActions";
import type { FillEvent, MarketTick, WsStatus } from "./hooks/useMarketStream";
import type { ShellState } from "./types/store";

const STREAM_URL =
  (import.meta.env["VITE_STREAM_URL"] as string | undefined) ??
  "ws://localhost:3016/stream";

const BOTTOM_PANEL_HEIGHT = 240;

/** Compact volume: 5 000 000 → 5.0M, 125 000 → 125K */
function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return v.toString();
}

function useThrottledValue<T>(value: T, limitMs: number): T {
  const [throttled, setThrottled] = useState<T>(value);
  const lastSetAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastSetAt.current;

    if (elapsed >= limitMs) {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      lastSetAt.current = now;
      timer.current = setTimeout(() => {
        setThrottled(value);
        timer.current = null;
      }, 0);
    } else {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        lastSetAt.current = Date.now();
        setThrottled(value);
        timer.current = null;
      }, limitMs - elapsed);
    }
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [value, limitMs]);

  return throttled;
}

// ── Ticker strip ─────────────────────────────────────────────────────────────
interface TickerStripProps {
  tick: MarketTick | null;
  status: WsStatus;
  showWatchlistToggle: boolean;
  onToggleWatchlist: () => void;
}

function TickerStrip({
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
        /* Distinct background anchors the strip inside the workspace,
           not the navigation chrome above it */
        bgcolor: "var(--pd-bg-canvas)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        flexShrink: 0,
        minHeight: 52,
        py: 0,
      }}
    >
      {/* Watchlist toggle on small screens */}
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
          {/* Symbol + last price — left-accented "selected instrument" block */}
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
              sx={{
                fontSize: "1rem",
                fontWeight: 800,
                letterSpacing: "0.01em",
                color: "text.primary",
                lineHeight: 1,
              }}
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

          {/* Bid / Ask — secondary group */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
            }}
          >
            <Tooltip
              title="Highest price a buyer is currently willing to pay"
              placement="bottom"
            >
              <Box sx={{ cursor: "default" }}>
                <Typography
                  display="block"
                  lineHeight={1}
                  sx={{
                    fontSize: "0.625rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    mb: 0.5,
                  }}
                >
                  Bid
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {tick.bid.toFixed(2)}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip
              title="Lowest price a seller is currently willing to accept"
              placement="bottom"
            >
              <Box sx={{ cursor: "default" }}>
                <Typography
                  display="block"
                  lineHeight={1}
                  sx={{
                    fontSize: "0.625rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    mb: 0.5,
                  }}
                >
                  Ask
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {tick.ask.toFixed(2)}
                </Typography>
              </Box>
            </Tooltip>
          </Box>

          {/* Spread + Volume — tertiary group, hidden on narrow */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
              ml: 3,
            }}
          >
            <Divider orientation="vertical" flexItem />
            <Tooltip
              title="Cost to trade — difference between ask and bid prices. Lower is better."
              placement="bottom"
            >
              <Box sx={{ cursor: "default" }}>
                <Typography
                  display="block"
                  lineHeight={1}
                  sx={{
                    fontSize: "0.625rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    mb: 0.5,
                  }}
                >
                  Spread
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    color: "text.secondary",
                    lineHeight: 1,
                  }}
                >
                  {spread}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip
              title="Total number of shares traded today"
              placement="bottom"
            >
              <Box sx={{ cursor: "default" }}>
                <Typography
                  display="block"
                  lineHeight={1}
                  sx={{
                    fontSize: "0.625rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.disabled",
                    mb: 0.5,
                  }}
                >
                  Volume
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    color: "text.secondary",
                    lineHeight: 1,
                  }}
                >
                  {fmtVol(tick.volume)}
                </Typography>
              </Box>
            </Tooltip>
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

      {/* Stale / reconnecting indicator */}
      {isStale && (
        <Chip
          label="RECONNECTING"
          size="small"
          color="warning"
          sx={{
            fontSize: "0.625rem",
            height: 18,
            fontWeight: 700,
            letterSpacing: "0.04em",
            animation: "pulse 1.5s ease-in-out infinite",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.4 },
            },
          }}
        />
      )}
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TradingTerminalPage() {
  const theme = useTheme();
  const isLg = useMediaQuery(theme.breakpoints.up("lg")); // ≥ 1200px

  const [bottomOpen, setBottomOpen] = useState(true);
  const [watchlistDrawerOpen, setWatchlistDrawerOpen] = useState(false);

  const watchlistRef = useRef<WatchlistPanelHandle>(null);
  const orderTicketRef = useRef<OrderTicketPanelHandle>(null);

  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const token = useSelector((s: ShellState) => s.auth.token) ?? "";
  const accountId = useSelector((s: ShellState) => s.auth.accountId) ?? "";
  const selectedSymbol = useSelector(
    (s: ShellState) => s.terminal.selectedSymbol,
  );

  const [fillQueue, setFillQueue] = useState<FillEvent[]>([]);
  const [currentFill, setCurrentFill] = useState<FillEvent | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFill = useCallback(
    (fill: FillEvent) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      setFillQueue((q) => [...q, fill]);
    },
    [queryClient],
  );

  useEffect(() => {
    if (currentFill !== null || fillQueue.length === 0) return;
    const [next, ...rest] = fillQueue;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFillQueue(rest);
    setCurrentFill(next ?? null);
  }, [currentFill, fillQueue]);

  const handleSnackbarClose = () => {
    setCurrentFill(null);
    if (gapTimer.current) clearTimeout(gapTimer.current);
    gapTimer.current = setTimeout(() => {
      gapTimer.current = null;
    }, 500);
  };

  const { data: symbols = [] } = useWatchlistQuery();

  const { snapshot, status } = useMarketStream({
    url: STREAM_URL,
    token,
    symbols,
    accountId: accountId || undefined,
    onFill: handleFill,
  });

  useEffect(() => {
    const mapped =
      status === "connected"
        ? "connected"
        : status === "reconnecting"
          ? "disconnected"
          : "connecting";
    dispatch(setConnectionStatus(mapped));
  }, [status, dispatch]);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (el as HTMLElement).isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      // F2 → focus order ticket symbol field
      if (e.key === "F2") {
        e.preventDefault();
        orderTicketRef.current?.focusSymbol();
        return;
      }
      // / → focus watchlist search (only when not already in an input)
      if (e.key === "/" && !isInputFocused()) {
        e.preventDefault();
        if (!isLg) setWatchlistDrawerOpen(true);
        // Small delay to let the drawer render before focusing
        setTimeout(() => watchlistRef.current?.focusSearch(), 50);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLg]);

  const selectedTick: MarketTick | null = selectedSymbol
    ? (snapshot[selectedSymbol] ?? null)
    : null;
  const throttledTick = useThrottledValue(selectedTick, 100);

  const watchlistPanel = (
    <WatchlistPanel ref={watchlistRef} snapshot={snapshot} />
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Fill notification ── */}
      <Snackbar
        open={currentFill !== null}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
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
          <TrendingUpIcon
            sx={{ fontSize: 18, color: "success.main", flexShrink: 0 }}
          />
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Order Filled
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {currentFill
                ? `${currentFill.symbol} × ${currentFill.filledQuantity} ${currentFill.side} FILLED at $${currentFill.fillPrice}`
                : ""}
            </Typography>
          </Box>
        </Paper>
      </Snackbar>

      {/* ── Ticker strip ── */}
      <TickerStrip
        tick={selectedTick}
        status={status}
        showWatchlistToggle={!isLg}
        onToggleWatchlist={() => setWatchlistDrawerOpen((o) => !o)}
      />

      {/* ── Main workspace ── */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Watchlist — inline on lg+, drawer on smaller screens */}
        {isLg ? (
          <Box
            sx={{
              width: 220,
              borderRight: 1,
              borderColor: "divider",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {watchlistPanel}
          </Box>
        ) : (
          <Drawer
            anchor="left"
            open={watchlistDrawerOpen}
            onClose={() => setWatchlistDrawerOpen(false)}
            PaperProps={{ sx: { width: 240 } }}
          >
            {watchlistPanel}
          </Drawer>
        )}

        {/* Chart — fills all remaining space */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            borderRight: 1,
            borderColor: "divider",
            minWidth: 0,
          }}
        >
          <ChartPanel
            symbol={selectedSymbol || null}
            tick={throttledTick}
            streamStatus={status}
          />
        </Box>

        {/* Order Ticket — 320px fixed right panel */}
        <Box
          sx={{
            width: 320,
            overflow: "hidden",
            flexShrink: 0,
            borderLeft: 1,
            borderColor: "divider",
          }}
        >
          <OrderTicketPanel
            ref={orderTicketRef}
            streamStatus={status}
            lastPrice={selectedTick?.last ?? null}
          />
        </Box>
      </Box>

      {/* ── Bottom panel — BlotterPanel owns tabs, collapse, and Positions ── */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: "divider",
          flexShrink: 0,
          overflow: "hidden",
          height: bottomOpen ? BOTTOM_PANEL_HEIGHT + 37 : 37,
        }}
      >
        <BlotterPanel
          accountId={accountId}
          isCollapsed={!bottomOpen}
          onCollapseToggle={() => setBottomOpen((o) => !o)}
        />
      </Box>
    </Box>
  );
}
