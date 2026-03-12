/**
 * T3 — SLI/SLO instrumentation validation
 *
 * AC:
 *   1. Core SLIs (availability, latency, error rate, event lag) are defined and measured
 *   2. SLO targets are encoded in dashboard panels/alert rules for staging profile
 *   3. Runbook references include where to inspect each signal
 */

import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..', '..'); // repo root

function readText(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function readJson<T>(relPath: string): T {
  return JSON.parse(readText(relPath)) as T;
}

type GrafanaPanel = {
  id: number;
  title: string;
  type?: string;
  targets?: Array<{ expr: string }>;
};

type GrafanaDashboard = {
  uid: string;
  title: string;
  panels: GrafanaPanel[];
};

// ── Recording rules ────────────────────────────────────────────────────────

describe('prometheus-rules.yml — recording rules', () => {
  let rules: string;

  beforeAll(() => { rules = readText('infrastructure/prometheus-rules.yml'); });

  it('should define availability SLI (5-minute window)', () => {
    expect(rules).toContain('sli:http_availability:ratio_rate5m');
    expect(rules).toContain('http_server_duration_milliseconds_count');
  });

  it('should define availability SLI (30-minute window) for slow-burn detection', () => {
    expect(rules).toContain('sli:http_availability:ratio_rate30m');
  });

  it('should define error rate SLI (5-minute window)', () => {
    expect(rules).toContain('sli:http_error_rate:ratio_rate5m');
  });

  it('should define latency p95 SLI using histogram_quantile', () => {
    expect(rules).toContain('sli:http_latency_p95_ms:rate5m');
    expect(rules).toContain('histogram_quantile');
    expect(rules).toContain('http_server_duration_milliseconds_bucket');
  });

  it('should define Kafka consumer lag SLI (event lag)', () => {
    expect(rules).toContain('sli:kafka_consumer_lag:sum_by_group');
    expect(rules).toContain('kafka_consumergroup_lag');
  });

  it('should set recording rule interval to 30s', () => {
    expect(rules).toContain('interval: 30s');
  });
});

// ── Alerting rules — availability ──────────────────────────────────────────

describe('prometheus-rules.yml — availability alert rules', () => {
  let rules: string;

  beforeAll(() => { rules = readText('infrastructure/prometheus-rules.yml'); });

  it('should have a fast-burn alert at >10% error rate', () => {
    expect(rules).toContain('AvailabilityBurnRateFast');
    expect(rules).toContain('0.10');
    expect(rules).toContain('severity: critical');
  });

  it('should fire AvailabilityBurnRateFast after 5 minutes', () => {
    // Locate the block and confirm `for: 5m` follows AvailabilityBurnRateFast
    const idx = rules.indexOf('AvailabilityBurnRateFast');
    const block = rules.slice(idx, idx + 300);
    expect(block).toContain('for: 5m');
  });

  it('should have a slow-burn alert at >1% error rate', () => {
    expect(rules).toContain('AvailabilityBurnRateSlow');
    expect(rules).toContain('0.01');
    expect(rules).toContain('severity: warning');
  });

  it('should fire AvailabilityBurnRateSlow after 30 minutes', () => {
    const idx = rules.indexOf('AvailabilityBurnRateSlow');
    const block = rules.slice(idx, idx + 300);
    expect(block).toContain('for: 30m');
  });

  it('should have a ServiceDown alert covering all 7 services', () => {
    expect(rules).toContain('ServiceDown');
    // regex covers all critical service jobs
    expect(rules).toContain('api-gateway|order-service|risk-service|execution-service|portfolio-service');
  });

  it('ServiceDown should fire within 1 minute', () => {
    const idx = rules.indexOf('ServiceDown');
    const block = rules.slice(idx, idx + 300);
    expect(block).toContain('for: 1m');
  });
});

// ── Alerting rules — latency ───────────────────────────────────────────────

describe('prometheus-rules.yml — latency alert rules', () => {
  let rules: string;

  beforeAll(() => { rules = readText('infrastructure/prometheus-rules.yml'); });

  it('should have a LatencyP95High alert at 500 ms (SLO target)', () => {
    expect(rules).toContain('LatencyP95High');
    expect(rules).toContain('> 500');
    expect(rules).toContain('severity: warning');
  });

  it('should have a LatencyP95Critical alert at 2000 ms (circuit-breaker zone)', () => {
    expect(rules).toContain('LatencyP95Critical');
    expect(rules).toContain('> 2000');
    expect(rules).toContain('severity: critical');
  });
});

// ── Alerting rules — Kafka lag ─────────────────────────────────────────────

describe('prometheus-rules.yml — Kafka event lag alert rules', () => {
  let rules: string;

  beforeAll(() => { rules = readText('infrastructure/prometheus-rules.yml'); });

  it('should have KafkaConsumerLagHigh at 1 000 messages', () => {
    expect(rules).toContain('KafkaConsumerLagHigh');
    expect(rules).toContain('> 1000');
    expect(rules).toContain('severity: warning');
  });

  it('should have KafkaConsumerLagCritical at 10 000 messages', () => {
    expect(rules).toContain('KafkaConsumerLagCritical');
    expect(rules).toContain('> 10000');
    expect(rules).toContain('severity: critical');
  });
});

// ── Alerting rules — circuit breaker ──────────────────────────────────────

describe('prometheus-rules.yml — circuit breaker alert rules', () => {
  let rules: string;

  beforeAll(() => { rules = readText('infrastructure/prometheus-rules.yml'); });

  it('should have CircuitBreakerOpen alert', () => {
    expect(rules).toContain('CircuitBreakerOpen');
    expect(rules).toContain('opossum_state');
    expect(rules).toContain('== 2');
  });
});

// ── Alert annotations — runbook + dashboard links ──────────────────────────

describe('prometheus-rules.yml — alert annotations', () => {
  let rules: string;

  beforeAll(() => { rules = readText('infrastructure/prometheus-rules.yml'); });

  const alerts = [
    'AvailabilityBurnRateFast',
    'AvailabilityBurnRateSlow',
    'ServiceDown',
    'LatencyP95High',
    'LatencyP95Critical',
    'KafkaConsumerLagHigh',
    'KafkaConsumerLagCritical',
    'CircuitBreakerOpen',
  ];

  for (const alert of alerts) {
    it(`${alert} should have a runbook annotation`, () => {
      const idx = rules.indexOf(alert);
      const block = rules.slice(idx, idx + 900);
      expect(block).toContain('runbook:');
      expect(block).toContain('observability-runbook.md');
    });

    it(`${alert} should have a dashboard annotation`, () => {
      const idx = rules.indexOf(alert);
      const block = rules.slice(idx, idx + 900);
      expect(block).toContain('dashboard:');
    });
  }
});

// ── prometheus.yml — rule_files wiring ────────────────────────────────────

describe('prometheus.yml — rule_files', () => {
  let prometheus: string;

  beforeAll(() => { prometheus = readText('infrastructure/prometheus.yml'); });

  it('should declare rule_files directive', () => {
    expect(prometheus).toContain('rule_files:');
  });

  it('should reference the rules directory', () => {
    expect(prometheus).toContain('rules/');
  });
});

// ── docker-compose.yml — rules file mount ────────────────────────────────

describe('docker-compose.yml — Prometheus rules mount', () => {
  let compose: string;

  beforeAll(() => { compose = readText('docker-compose.yml'); });

  it('should mount prometheus-rules.yml into the Prometheus container', () => {
    expect(compose).toContain('prometheus-rules.yml');
  });

  it('should enable Prometheus lifecycle API for hot-reload', () => {
    expect(compose).toContain('--web.enable-lifecycle');
  });
});

// ── SLO dashboard ─────────────────────────────────────────────────────────

describe('pulsedesk-slo.json dashboard', () => {
  let dashboard: GrafanaDashboard;

  beforeAll(() => {
    dashboard = readJson('infrastructure/grafana/dashboards/pulsedesk-slo.json');
  });

  it('should have uid pulsedesk-slo', () => {
    expect(dashboard.uid).toBe('pulsedesk-slo');
  });

  it('should have an availability stat panel referencing sli:http_availability', () => {
    const panel = dashboard.panels.find((p) => /availability/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('sli:http_availability');
  });

  it('should have a latency p95 stat panel referencing sli:http_latency_p95', () => {
    const panel = dashboard.panels.find((p) => /latency/i.test(p.title) && /p95/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('sli:http_latency_p95_ms');
  });

  it('should have an error rate stat panel referencing sli:http_error_rate', () => {
    const panel = dashboard.panels.find((p) => /error rate/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('sli:http_error_rate');
  });

  it('should have a Kafka consumer lag stat panel', () => {
    const panel = dashboard.panels.find((p) => /kafka/i.test(p.title) && /lag/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('sli:kafka_consumer_lag');
  });

  it('should have a burn rate timeseries panel with threshold reference lines', () => {
    const panel = dashboard.panels.find((p) => /burn rate/i.test(p.title));
    expect(panel).toBeDefined();
    const exprs = (panel?.targets ?? []).map((t) => t.expr);
    // Must show both windows and both threshold lines
    expect(exprs.some((e) => e.includes('rate5m'))).toBe(true);
    expect(exprs.some((e) => e.includes('0.10'))).toBe(true); // fast-burn threshold
    expect(exprs.some((e) => e.includes('0.01'))).toBe(true); // slow-burn threshold
  });

  it('should have an active alerts panel', () => {
    const panel = dashboard.panels.find((p) => /alert/i.test(p.title));
    expect(panel).toBeDefined();
  });

  it('should have an error budget gauge panel', () => {
    const panel = dashboard.panels.find((p) => /budget/i.test(p.title));
    expect(panel).toBeDefined();
  });
});

// ── Runbook — section coverage ────────────────────────────────────────────

describe('observability-runbook.md — alert section coverage', () => {
  let runbook: string;

  beforeAll(() => { runbook = readText('docs/runbook/observability-runbook.md'); });

  const requiredSections = [
    { alert: 'AvailabilityBurnRateFast', anchor: 'availability-fast-burn' },
    { alert: 'AvailabilityBurnRateSlow', anchor: 'availability-slow-burn' },
    { alert: 'ServiceDown', anchor: 'service-down' },
    { alert: 'LatencyP95High', anchor: 'latency-p95' },
    { alert: 'LatencyP95Critical', anchor: 'latency-p95-critical' },
    { alert: 'KafkaConsumerLagHigh', anchor: 'kafka-consumer-lag' },
    { alert: 'KafkaConsumerLagCritical', anchor: 'kafka-consumer-lag-critical' },
    { alert: 'CircuitBreakerOpen', anchor: 'circuit-breaker-open' },
  ];

  for (const { alert, anchor } of requiredSections) {
    it(`should have a section for ${alert}`, () => {
      expect(runbook).toContain(anchor);
    });
  }

  it('should include SLO reference table with all 4 SLIs', () => {
    expect(runbook).toContain('Availability');
    expect(runbook).toContain('Latency p95');
    expect(runbook).toContain('Error rate');
    expect(runbook).toContain('Kafka consumer lag');
  });

  it('should include PromQL query examples for each SLI', () => {
    expect(runbook).toContain('sli:http_availability:ratio_rate5m');
    expect(runbook).toContain('sli:http_latency_p95_ms:rate5m');
    expect(runbook).toContain('sli:kafka_consumer_lag:sum_by_group');
  });

  it('should include Loki LogQL query examples', () => {
    expect(runbook).toContain('logql');
    expect(runbook).toContain('level="error"');
  });

  it('should include hot-reload instructions for rule changes', () => {
    expect(runbook).toContain('/-/reload');
  });

  it('should include an escalation table with severity levels', () => {
    expect(runbook).toContain('critical');
    expect(runbook).toContain('warning');
    expect(runbook).toContain('Escalation');
  });
});
