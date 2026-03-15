import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { Box, Chip, Typography, useTheme } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import type { MarketTick, WsStatus } from "../hooks/useMarketStream";

interface ChartPanelProps {
  symbol: string | null;
  tick: MarketTick | null;
  streamStatus: WsStatus;
}

const MAX_POINTS = 300;

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

export function ChartPanel({ symbol, tick, streamStatus }: ChartPanelProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const pointsRef = useRef<{ time: number; value: number }[]>([]);
  const [prices, setPrices] = useState<{
    last: number | null;
    prev: number | null;
  }>({
    last: null,
    prev: null,
  });

  // Recreate chart when symbol changes OR when the theme mode toggles
  useEffect(() => {
    if (!containerRef.current || !symbol) return;

    const bg = theme.palette.background.default;
    const grid = theme.palette.divider;
    const txt = theme.palette.text.secondary;
    const line = theme.palette.primary.main;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: txt,
      },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: {
        vertLine: {
          color: theme.palette.text.disabled,
          labelBackgroundColor: theme.palette.background.paper,
        },
        horzLine: {
          color: theme.palette.text.disabled,
          labelBackgroundColor: theme.palette.background.paper,
        },
      },
      timeScale: {
        borderColor: grid,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: grid },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(LineSeries, {
      color: line,
      lineWidth: 2,
      priceLineColor: line,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    pointsRef.current = [];
    queueMicrotask(() => setPrices({ last: null, prev: null }));

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, theme.palette.mode]);

  useEffect(() => {
    if (!tick || !seriesRef.current || tick.symbol !== symbol) return;

    const t = toUnixSeconds(tick.timestamp);
    const points = pointsRef.current;
    const prev = points[points.length - 1];
    const nextTime = prev && t <= prev.time ? prev.time + 1 : t;
    const point = { time: nextTime, value: tick.last };

    if (points.length >= MAX_POINTS) points.shift();
    points.push(point);
    seriesRef.current.update(
      point as Parameters<typeof seriesRef.current.update>[0],
    );

    queueMicrotask(() =>
      setPrices((p) => ({ prev: p.last ?? tick.last, last: tick.last })),
    );
  }, [tick, symbol]);

  const { last: lastPrice, prev: prevPrice } = prices;
  const priceDir =
    lastPrice !== null && prevPrice !== null
      ? lastPrice > prevPrice
        ? "up"
        : lastPrice < prevPrice
          ? "down"
          : "flat"
      : "flat";

  const priceColor =
    priceDir === "up"
      ? "trading.uptick"
      : priceDir === "down"
        ? "trading.downtick"
        : "text.primary";

  const priceDelta =
    lastPrice !== null && prevPrice !== null && prevPrice !== 0
      ? ((lastPrice - prevPrice) / prevPrice) * 100
      : null;

  const isStale = streamStatus === "reconnecting";

  if (!symbol) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 1,
          bgcolor: "background.default",
        }}
      >
        <Typography variant="body2" color="text.disabled">
          Select a symbol to view chart
        </Typography>
      </Box>
    );
  }

  // No header bar — chart fills 100% of the panel.
  // Overlays replace the old header so no vertical space is wasted.
  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        bgcolor: "background.default",
      }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
        aria-hidden="true"
      />

      {/* Symbol + delta + live status — top-left context anchor */}
      <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography
          sx={{
            fontSize: '1rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            color: 'text.primary',
            lineHeight: 1,
            bgcolor: 'background.default',
            px: 1,
            py: 0.5,
            borderRadius: 0.5,
            opacity: 0.92,
          }}
        >
          {symbol}
        </Typography>
        {priceDelta !== null && (
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: priceColor,
              fontVariantNumeric: 'tabular-nums',
              transition: 'color 0.4s',
              bgcolor: 'background.default',
              px: 1,
              py: 0.5,
              borderRadius: 0.5,
              opacity: 0.92,
              lineHeight: 1,
            }}
          >
            {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(3)}%
          </Typography>
        )}
        {/* LIVE badge — only when connected and receiving data */}
        {streamStatus === 'connected' && lastPrice !== null && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'background.default',
              px: 1,
              py: 0.5,
              borderRadius: 0.5,
              opacity: 0.92,
            }}
          >
            <FiberManualRecordIcon
              sx={{
                fontSize: 7,
                color: 'success.main',
                animation: 'livePulse 2s ease-in-out infinite',
                '@keyframes livePulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'success.main',
                lineHeight: 1,
              }}
            >
              LIVE
            </Typography>
          </Box>
        )}
      </Box>

      {/* Waiting for first tick */}
      {lastPrice === null && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Typography variant="caption" color="text.disabled">
            Waiting for first tick…
          </Typography>
        </Box>
      )}

      {/* STALE badge — top-right */}
      {isStale && (
        <Box sx={{ position: "absolute", top: 8, right: 10, zIndex: 2 }}>
          <Chip
            label="STALE"
            size="small"
            color="warning"
            sx={{
              fontSize: "0.625rem",
              height: 18,
              fontWeight: 700,
              letterSpacing: "0.06em",
              animation: "pulse 1.5s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.45 },
              },
            }}
          />
        </Box>
      )}

      {/* Screen-reader live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {symbol} last price
        {lastPrice !== null ? `: ${lastPrice.toFixed(2)}` : " pending"}
      </div>
    </Box>
  );
}
