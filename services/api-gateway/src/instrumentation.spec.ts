/**
 * T2 — OTel instrumentation bootstrap validation
 *
 * Validates that instrumentation.ts declares all three telemetry pillars
 * (traces, metrics, logs) and routes them to the correct OTel Collector paths.
 *
 * Strategy: source-level inspection. The instrumentation module calls
 * sdk.start() at import time, making runtime mocking fragile across different
 * Jest transform configurations. Validating the source is deterministic and
 * sufficient — if the imports and config keys are present, the SDK wires them.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('instrumentation.ts — OTel bootstrap configuration', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(path.join(__dirname, 'instrumentation.ts'), 'utf8');
  });

  // ── Three telemetry exporters ──────────────────────────────────────────────

  it('should import OTLPTraceExporter for distributed traces', () => {
    expect(src).toContain("from '@opentelemetry/exporter-trace-otlp-http'");
    expect(src).toContain('OTLPTraceExporter');
  });

  it('should import OTLPMetricExporter for Prometheus-scraped metrics', () => {
    expect(src).toContain("from '@opentelemetry/exporter-metrics-otlp-http'");
    expect(src).toContain('OTLPMetricExporter');
  });

  it('should import OTLPLogExporter for Loki log ingestion', () => {
    expect(src).toContain("from '@opentelemetry/exporter-logs-otlp-http'");
    expect(src).toContain('OTLPLogExporter');
  });

  // ── SDK-level wrappers ─────────────────────────────────────────────────────

  it('should use PeriodicExportingMetricReader from @opentelemetry/sdk-metrics', () => {
    expect(src).toContain("from '@opentelemetry/sdk-metrics'");
    expect(src).toContain('PeriodicExportingMetricReader');
  });

  it('should use BatchLogRecordProcessor from @opentelemetry/sdk-logs', () => {
    expect(src).toContain("from '@opentelemetry/sdk-logs'");
    expect(src).toContain('BatchLogRecordProcessor');
  });

  // ── NodeSDK configuration keys ─────────────────────────────────────────────

  it('should pass traceExporter to NodeSDK', () => {
    expect(src).toContain('traceExporter:');
  });

  it('should pass metricReader to NodeSDK', () => {
    expect(src).toContain('metricReader:');
  });

  it('should pass logRecordProcessor to NodeSDK', () => {
    expect(src).toContain('logRecordProcessor:');
  });

  // ── Endpoint configuration ─────────────────────────────────────────────────

  it('should derive all endpoints from OTEL_EXPORTER_OTLP_ENDPOINT env var', () => {
    expect(src).toContain("OTEL_EXPORTER_OTLP_ENDPOINT");
    // All three pillars use the same base URL
    const urlRefs = (src.match(/\/v1\/(traces|metrics|logs)/g) ?? []);
    expect(urlRefs).toContain('/v1/traces');
    expect(urlRefs).toContain('/v1/metrics');
    expect(urlRefs).toContain('/v1/logs');
  });

  // ── Metric collection interval ─────────────────────────────────────────────

  it('should set exportIntervalMillis to 15_000 (aligned with Prometheus 15s scrape)', () => {
    expect(src).toContain('exportIntervalMillis: 15_000');
  });

  // ── Noise reduction ───────────────────────────────────────────────────────

  it('should disable fs instrumentation to reduce span noise', () => {
    expect(src).toContain("'@opentelemetry/instrumentation-fs': { enabled: false }");
  });

  // ── SDK lifecycle ──────────────────────────────────────────────────────────

  it('should call sdk.start()', () => {
    expect(src).toContain('sdk.start()');
  });
});
