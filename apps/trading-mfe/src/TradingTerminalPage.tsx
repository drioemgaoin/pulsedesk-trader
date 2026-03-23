import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Drawer,
  Snackbar,
  useMediaQuery,
  useTheme,
} from "@pulsedesk/ui";
import { WatchlistPanel } from "./components/WatchlistPanel";
import type { WatchlistPanelHandle } from "./components/WatchlistPanel";
import { ChartPanel } from "./components/ChartPanel";
import { OrderTicketPanel } from "./components/OrderTicketPanel";
import type { OrderTicketPanelHandle } from "./components/OrderTicketPanel";
import { BlotterPanel } from "./components/BlotterPanel";
import { TickerStrip } from "./components/TickerStrip";
import { FillToast } from "./components/FillToast";
import { useMarketStream } from "./hooks/useMarketStream";
import { useWatchlistQuery } from "./hooks/useWatchlistQuery";
import { setConnectionStatus } from "./store/terminalActions";
import type { FillEvent, MarketTick } from "./hooks/useMarketStream";
import type { ShellState } from "./types/store";

const STREAM_URL =
  (import.meta.env["VITE_STREAM_URL"] as string | undefined) ??
  "ws://localhost:3016/stream";

const BOTTOM_PANEL_HEIGHT = 240;

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
        {currentFill ? <FillToast fill={currentFill} /> : <span />}
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
          transition: "height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
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
