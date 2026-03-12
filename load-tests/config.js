/**
 * Shared load-test configuration.
 *
 * Override via env vars:
 *   BASE_URL          default: http://localhost:3000
 *   DEMO_USERNAME     default: trader
 *   DEMO_PASSWORD     default: pulsedesk
 *   ACCOUNT_ID        default: trader  (must match JWT sub)
 */

export const BASE_URL    = __ENV.BASE_URL      || 'http://localhost:3000';
export const USERNAME    = __ENV.DEMO_USERNAME  || 'trader';
export const PASSWORD    = __ENV.DEMO_PASSWORD  || 'pulsedesk';
export const ACCOUNT_ID  = __ENV.ACCOUNT_ID     || 'trader';

/** SLO thresholds — any breach fails the run */
export const THRESHOLDS = {
  // Gateway must return <500 ms at p95 for each scenario group
  'http_req_duration{scenario:watchlist_baseline}': ['p(95)<500'],
  'http_req_duration{scenario:order_query_baseline}': ['p(95)<500'],
  'http_req_duration{scenario:order_submit_baseline}': ['p(95)<500'],
  'http_req_duration{scenario:watchlist_stress}': ['p(95)<2000'],
  'http_req_duration{scenario:order_query_stress}': ['p(95)<2000'],
  'http_req_duration{scenario:order_submit_stress}': ['p(95)<2000'],
  // 5xx rate < 1% — 429 (rate-limited) is expected under load and excluded
  // via http.setResponseCallback(http.expectedStatuses({min:200,max:399},429))
  'http_req_failed{expected_response:true}': ['rate<0.01'],
};
