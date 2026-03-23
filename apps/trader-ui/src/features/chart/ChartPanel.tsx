import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import type { MarketTick, WsStatus } from '../watchlist/useMarketStream';

interface ChartPanelProps {
  symbol: string | null;
  tick: MarketTick | null;
  streamStatus: WsStatus;
}

const MAX_POINTS = 300; // ~5 minutes at 1 tick/s

// Convert ISO timestamp to unix seconds for lightweight-charts
function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

export function ChartPanel({ symbol, tick, streamStatus }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const pointsRef = useRef<{ time: number; value: number }[]>([]);
  const [prices, setPrices] = useState<{ last: number | null; prev: number | null }>({ last: null, prev: null });
  const chartBg = '#FFFFFF';
  const chartGrid = 'rgba(15, 23, 42, 0.10)';
  const chartText = '#6B7280';
  const chartBorder = 'rgba(15, 23, 42, 0.18)';

  // Create / destroy chart when symbol changes
  useEffect(() => {
    if (!containerRef.current || !symbol) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartBg },
        textColor: chartText,
      },
      grid: {
        vertLines: { color: chartGrid },
        horzLines: { color: chartGrid },
      },
      crosshair: {
        vertLine: { color: '#94A3B8', labelBackgroundColor: chartBg },
        horzLine: { color: '#94A3B8', labelBackgroundColor: chartBg },
      },
      timeScale: { borderColor: chartBorder, timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: chartBorder },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(LineSeries, {
      color: '#60a5fa',
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

  // Apply each throttled tick to the chart
  useEffect(() => {
    if (!tick || !seriesRef.current || tick.symbol !== symbol) return;

    const t = toUnixSeconds(tick.timestamp);
    const points = pointsRef.current;

    // lightweight-charts requires strictly increasing time — dedupe by taking max
    const prev = points[points.length - 1];
    const nextTime = prev && t <= prev.time ? prev.time + 1 : t;
    const point = { time: nextTime, value: tick.last };

    if (points.length >= MAX_POINTS) points.shift();
    points.push(point);

    seriesRef.current.update(point as Parameters<typeof seriesRef.current.update>[0]);

    queueMicrotask(() => setPrices((p) => ({ prev: p.last ?? tick.last, last: tick.last })));
  }, [tick, symbol]);

  const { last: lastPrice, prev: prevPrice } = prices;
  const priceClass =
    lastPrice !== null && prevPrice !== null
      ? lastPrice > prevPrice
        ? 'text-green-400'
        : lastPrice < prevPrice
        ? 'text-red-400'
        : 'text-zinc-200'
      : 'text-zinc-200';

  if (!symbol) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-zinc-950">
        <p className="text-xs text-zinc-500">Select a symbol from the watchlist</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-2 flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-200">{symbol}</span>
        {lastPrice !== null && (
          <span className={`text-xs font-medium tabular-nums ${priceClass}`}>
            {lastPrice.toFixed(2)}
          </span>
        )}
        {streamStatus === 'reconnecting' && (
          <span className="ml-auto text-xs text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Stream paused
          </span>
        )}
      </div>

      {/* Chart body */}
      <div className="flex-1 relative min-h-0">
        {lastPrice === null && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-xs text-zinc-500">Waiting for first tick…</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" aria-hidden="true" />
        {/* Screen-reader live region */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {symbol} last price{lastPrice !== null ? `: ${lastPrice.toFixed(2)}` : ' pending'}
        </div>
      </div>
    </div>
  );
}
