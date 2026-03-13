import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';
import { Box, Typography } from '@mui/material';
import type { UTCTimestamp } from 'lightweight-charts';

export interface PnlPoint {
  time: UTCTimestamp;
  value: number;
}

interface PnlChartProps {
  data: PnlPoint[];
  height?: number;
}

export function PnlChart({ data, height = 140 }: PnlChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth || 600,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#9e9e9e',
      },
      grid: {
        vertLines: { color: '#1e1e1e', style: LineStyle.Dotted },
        horzLines: { color: '#1e1e1e', style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: '#2e2e2e' },
      timeScale: { borderColor: '#2e2e2e', timeVisible: true },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#26a69a',
      topColor: '#26a69a33',
      bottomColor: '#26a69a00',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (data.length > 0) {
      series.setData(data);
      chart.timeScale().fitContent();
    }

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [data, height]);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
        Aggregate Unrealized P&L (last 5 min)
      </Typography>
      <div ref={containerRef} style={{ width: '100%', height }} />
    </Box>
  );
}
