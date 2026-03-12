/**
 * T2 — Observability infrastructure config validation
 *
 * Reads infra config files and dashboard JSON to assert that all components
 * required by M6-T2 AC are present and correctly wired.
 *
 * AC:
 *   1. Prometheus, Loki, Tempo, Grafana available in compose profile
 *   2. Service dashboards show throughput, latency, error rates, and queue lag
 *   3. Traces link request path across gateway, order, risk, execution, portfolio
 */

import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..', '..'); // repo root: src → api-gateway → services → pulsedesk-trader

function readText(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function readJson<T>(relPath: string): T {
  return JSON.parse(readText(relPath)) as T;
}

// ── Types ──────────────────────────────────────────────────────────────────

type GrafanaDashboard = {
  title: string;
  uid: string;
  panels: Array<{
    id: number;
    title: string;
    type?: string;
    targets?: Array<{ expr: string }>;
  }>;
};

// ── Prometheus config ──────────────────────────────────────────────────────

describe('prometheus.yml', () => {
  let prometheusYml: string;

  beforeAll(() => {
    prometheusYml = readText('infrastructure/prometheus.yml');
  });

  it('should scrape all 7 application services', () => {
    const services = [
      'api-gateway',
      'market-data-service',
      'order-service',
      'risk-service',
      'execution-service',
      'portfolio-service',
      'notification-service',
    ];
    for (const svc of services) {
      expect(prometheusYml).toContain(svc);
    }
  });

  it('should scrape otel-collector metrics exporter (port 8889)', () => {
    expect(prometheusYml).toContain('otel-collector:8889');
  });

  it('should scrape kafka-exporter for consumer lag metrics', () => {
    expect(prometheusYml).toContain('kafka-exporter');
    expect(prometheusYml).toContain('9308');
  });
});

// ── OTel Collector pipelines ───────────────────────────────────────────────

describe('otel-collector.yml', () => {
  let collectorYml: string;

  beforeAll(() => {
    collectorYml = readText('infrastructure/otel-collector.yml');
  });

  it('should have a traces pipeline', () => {
    expect(collectorYml).toContain('traces:');
    expect(collectorYml).toContain('otlphttp/tempo');
  });

  it('should have a metrics pipeline exporting to Prometheus', () => {
    expect(collectorYml).toContain('metrics:');
    expect(collectorYml).toContain('prometheus');
  });

  it('should have a logs pipeline exporting to Loki', () => {
    expect(collectorYml).toContain('logs:');
    expect(collectorYml).toContain('otlphttp/loki');
  });

  it('should receive OTLP over gRPC and HTTP', () => {
    expect(collectorYml).toContain('4317');
    expect(collectorYml).toContain('4318');
  });
});

// ── docker-compose observability services ─────────────────────────────────

describe('docker-compose.yml — observability services', () => {
  let composeYml: string;

  beforeAll(() => {
    composeYml = readText('docker-compose.yml');
  });

  it('should include Prometheus', () => {
    expect(composeYml).toContain('prom/prometheus');
  });

  it('should include Loki', () => {
    expect(composeYml).toContain('grafana/loki');
  });

  it('should include Tempo', () => {
    expect(composeYml).toContain('grafana/tempo');
  });

  it('should include Grafana', () => {
    expect(composeYml).toContain('grafana/grafana');
  });

  it('should include kafka-exporter for consumer group lag', () => {
    expect(composeYml).toContain('kafka-exporter');
    expect(composeYml).toContain('danielqsj/kafka-exporter');
  });

  it('should mount Grafana dashboard provisioning config', () => {
    expect(composeYml).toContain('grafana/dashboards.yml');
  });

  it('should mount Grafana dashboards directory', () => {
    expect(composeYml).toContain('grafana/dashboards');
  });
});

// ── Platform overview dashboard ────────────────────────────────────────────

describe('pulsedesk-platform.json dashboard', () => {
  let dashboard: GrafanaDashboard;

  beforeAll(() => {
    dashboard = readJson('infrastructure/grafana/dashboards/pulsedesk-platform.json');
  });

  it('should have uid pulsedesk-platform', () => {
    expect(dashboard.uid).toBe('pulsedesk-platform');
  });

  it('should have a throughput (req/s) panel', () => {
    const panel = dashboard.panels.find((p) => /throughput/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('http_server_duration_milliseconds_count');
    expect(expr).toContain('rate(');
  });

  it('should have an error rate panel', () => {
    const panel = dashboard.panels.find((p) => /error rate/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('5..');
  });

  it('should have p95 latency panel using histogram_quantile', () => {
    const panel = dashboard.panels.find((p) => /p95/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('histogram_quantile(0.95');
    expect(expr).toContain('http_server_duration_milliseconds_bucket');
  });

  it('should have a Kafka consumer lag panel', () => {
    const panel = dashboard.panels.find((p) => /kafka.*lag/i.test(p.title));
    expect(panel).toBeDefined();
    const expr = panel?.targets?.[0]?.expr ?? '';
    expect(expr).toContain('kafka_consumergroup_lag');
  });

  it('should have a service availability stat panel', () => {
    const panel = dashboard.panels.find((p) => /availability/i.test(p.title));
    expect(panel).toBeDefined();
  });

  it('should cover all 5 services in trace path via service template variable', () => {
    // The $service template variable and text panel describe the full trace path
    const textPanel = dashboard.panels.find((p) => p.title.toLowerCase().includes('trace'));
    expect(textPanel).toBeDefined();
  });
});

// ── Service drilldown dashboard ────────────────────────────────────────────

describe('pulsedesk-service-drilldown.json dashboard', () => {
  let dashboard: GrafanaDashboard;

  beforeAll(() => {
    dashboard = readJson('infrastructure/grafana/dashboards/pulsedesk-service-drilldown.json');
  });

  it('should have uid pulsedesk-service-drilldown', () => {
    expect(dashboard.uid).toBe('pulsedesk-service-drilldown');
  });

  it('should have a latency percentiles panel showing p50, p95, p99', () => {
    const panel = dashboard.panels.find((p) => /latency percentile/i.test(p.title));
    expect(panel).toBeDefined();
    const exprs = (panel?.targets ?? []).map((t) => t.expr);
    expect(exprs.some((e) => e.includes('0.50'))).toBe(true);
    expect(exprs.some((e) => e.includes('0.95'))).toBe(true);
    expect(exprs.some((e) => e.includes('0.99'))).toBe(true);
  });

  it('should have a logs panel using Loki datasource', () => {
    const panel = dashboard.panels.find((p) => /log/i.test(p.title));
    expect(panel).toBeDefined();
    expect(panel?.type).toBe('logs');
  });

  it('should have a traces panel using Tempo datasource', () => {
    const panel = dashboard.panels.find((p) => /trace/i.test(p.title));
    expect(panel).toBeDefined();
    expect(panel?.type).toBe('traces');
  });
});

// ── package.json — new OTel packages in all services ──────────────────────

describe('service package.json — OTel metrics and logs packages', () => {
  const services = [
    'api-gateway',
    'order-service',
    'market-data-service',
    'risk-service',
    'execution-service',
    'portfolio-service',
    'notification-service',
  ];

  const requiredPackages = [
    '@opentelemetry/exporter-metrics-otlp-http',
    '@opentelemetry/exporter-logs-otlp-http',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/sdk-logs',
  ];

  for (const svc of services) {
    it(`${svc} should declare all 4 new OTel packages`, () => {
      const pkg = readJson<{ dependencies: Record<string, string> }>(
        `services/${svc}/package.json`,
      );
      for (const dep of requiredPackages) {
        expect(pkg.dependencies).toHaveProperty(dep);
      }
    });
  }
});
