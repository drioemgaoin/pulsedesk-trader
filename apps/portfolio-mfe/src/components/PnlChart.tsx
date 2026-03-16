import { useEffect, useRef } from 'react';
import { useTheme } from '@pulsedesk/ui';
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';
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
  const theme = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const bg = theme.palette.background.paper;
    const textColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;

    const chart = createChart(el, {
      width: el.clientWidth || 600,
      height,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor, style: LineStyle.Dotted },
        horzLines: { color: gridColor, style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor, timeVisible: true },
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
  }, [data, height, theme.palette.mode, theme.palette.background.paper, theme.palette.divider, theme.palette.text.secondary]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
