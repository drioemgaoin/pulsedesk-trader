import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Link,
  Stack,
  Typography,
  ExpandMoreIcon,
} from '@pulsedesk/ui';

const GRAFANA_URL =
  (import.meta.env['VITE_GRAFANA_URL'] as string | undefined) ?? 'http://localhost:3001';

const DASHBOARD_LINKS = [
  { label: 'API Gateway — Request Rate', path: '/d/api-gateway' },
  { label: 'Order Service — Throughput', path: '/d/order-service' },
  { label: 'Kafka — Consumer Lag', path: '/d/kafka-lag' },
  { label: 'Risk Service — Evaluation Rate', path: '/d/risk-service' },
  { label: 'Execution Service — Fill Throughput', path: '/d/execution-service' },
];

export function ObservabilityLinks() {
  return (
    <Accordion defaultExpanded={false}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="observability-links">
        <Typography variant="subtitle2">Observability Dashboards</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Open Grafana while running a Steady or Ramp profile to observe autoscaling input
          signals.
        </Typography>
        <Stack spacing={0.5}>
          {DASHBOARD_LINKS.map(({ label, path }) => (
            <Link
              key={path}
              href={`${GRAFANA_URL}${path}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              aria-label={label}
            >
              {label} ↗
            </Link>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
