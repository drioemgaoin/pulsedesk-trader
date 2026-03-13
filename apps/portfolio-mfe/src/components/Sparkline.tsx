import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 120, height = 40, color = '#26a69a' }: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.length < 2) return;

    const chart = createChart(el, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}00`,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    series.setData(
      data.map((value, i) => ({ time: (i + 1) as unknown as import('lightweight-charts').UTCTimestamp, value })),
    );
    chart.timeScale().fitContent();

    return () => { chart.remove(); };
  }, [data, width, height, color]);

  return <div ref={containerRef} style={{ width, height, display: 'inline-block' }} />;
}
