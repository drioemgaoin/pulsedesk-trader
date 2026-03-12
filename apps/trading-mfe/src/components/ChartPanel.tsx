import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { Box, Typography } from '@mui/material';
import type { MarketTick, WsStatus } from '../hooks/useMarketStream';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const pointsRef = useRef<{ time: number; value: number }[]>([]);
  const [prices, setPrices] = useState<{ last: number | null; prev: number | null }>({
    last: null,
    prev: null,
  });

  useEffect(() => {
    if (!containerRef.current || !symbol) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#888888' },
      grid: { vertLines: { color: '#2a2a2a' }, horzLines: { color: '#2a2a2a' } },
      crosshair: { vertLine: { color: '#444444' }, horzLine: { color: '#444444' } },
      timeScale: { borderColor: '#2a2a2a', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#2a2a2a' },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(LineSeries, {
      color: '#00bcd4',
      lineWidth: 2,
      priceLineVisible: true,
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
  }, [symbol]);

  useEffect(() => {
    if (!tick || !seriesRef.current || tick.symbol !== symbol) return;

    const t = toUnixSeconds(tick.timestamp);
    const points = pointsRef.current;
    const prev = points[points.length - 1];
    const nextTime = prev && t <= prev.time ? prev.time + 1 : t;
    const point = { time: nextTime, value: tick.last };

    if (points.length >= MAX_POINTS) points.shift();
    points.push(point);
    seriesRef.current.update(point as Parameters<typeof seriesRef.current.update>[0]);

    queueMicrotask(() => setPrices((p) => ({ prev: p.last ?? tick.last, last: tick.last })));
  }, [tick, symbol]);

  const { last: lastPrice, prev: prevPrice } = prices;
  const priceColor =
    lastPrice !== null && prevPrice !== null
      ? lastPrice > prevPrice
        ? 'trading.uptick'
        : lastPrice < prevPrice
        ? 'trading.downtick'
        : 'text.primary'
      : 'text.primary';

  if (!symbol) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'background.default' }}>
        <Typography variant="caption" color="text.disabled">
          Select a symbol from the watchlist
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {symbol}
        </Typography>
        {lastPrice !== null && (
          <Typography variant="body2" sx={{ color: priceColor, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
            {lastPrice.toFixed(2)}
          </Typography>
        )}
        {streamStatus === 'reconnecting' && (
          <Typography variant="caption" color="warning.main" sx={{ ml: 'auto' }}>
            Stream paused
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {lastPrice === null && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <Typography variant="caption" color="text.disabled">
              Waiting for first tick…
            </Typography>
          </Box>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} aria-hidden="true" />
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {symbol} last price{lastPrice !== null ? `: ${lastPrice.toFixed(2)}` : ' pending'}
        </div>
      </Box>
    </Box>
  );
}
