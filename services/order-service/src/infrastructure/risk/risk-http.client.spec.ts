import { RiskHttpClient } from './risk-http.client';
import { RiskEvaluationRequest } from '../../domain/ports/risk-client.port';

const BASE_REQ: RiskEvaluationRequest = {
  orderId: 'order-1',
  commandId: 'cmd-1',
  symbol: 'AAPL',
  quantity: 10,
  limitPrice: 150,
};

const APPROVED_BODY = { outcome: 'APPROVED', reasonCode: 'NONE', reasons: [] };
const REJECTED_BODY = { outcome: 'REJECTED', reasonCode: 'QUANTITY_LIMIT_EXCEEDED', reasons: ['qty exceeded'] };

const mockFetch = (body: unknown, status = 200): jest.Mock =>
  jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

describe('Given the risk service is reachable', () => {
  let client: RiskHttpClient;

  beforeEach(async () => {
    process.env['RISK_SERVICE_URL'] = 'http://risk-service:3013';
    process.env['RISK_SERVICE_TIMEOUT_MS'] = '2000';
    process.env['INTERNAL_RISK_API_KEY'] = 'test-key';
    client = new RiskHttpClient();
    await client.onModuleInit();
  });

  describe('when the risk service returns APPROVED', () => {
    it('should return an approved RiskEvaluationResult', async () => {
      global.fetch = mockFetch(APPROVED_BODY);
      const result = await client.evaluate(BASE_REQ);
      expect(result.outcome).toBe('APPROVED');
      expect(result.reasonCode).toBe('NONE');
    });

    it('should call the risk endpoint with correct payload and headers', async () => {
      const fetchMock = mockFetch(APPROVED_BODY);
      global.fetch = fetchMock;
      await client.evaluate(BASE_REQ);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://risk-service:3013/v1/risk/evaluate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
        }),
      );
    });

    it('should include orderId and commandId in the request body', async () => {
      const fetchMock = mockFetch(APPROVED_BODY);
      global.fetch = fetchMock;
      await client.evaluate(BASE_REQ);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['orderId']).toBe(BASE_REQ.orderId);
      expect(body['commandId']).toBe(BASE_REQ.commandId);
      expect(body['symbol']).toBe(BASE_REQ.symbol);
      expect(body['quantity']).toBe(BASE_REQ.quantity);
      expect(body['limitPrice']).toBe(BASE_REQ.limitPrice);
    });
  });

  describe('when the risk service returns REJECTED', () => {
    it('should return a rejected RiskEvaluationResult', async () => {
      global.fetch = mockFetch(REJECTED_BODY);
      const result = await client.evaluate(BASE_REQ);
      expect(result.outcome).toBe('REJECTED');
      expect(result.reasonCode).toBe('QUANTITY_LIMIT_EXCEEDED');
    });
  });

  describe('when the risk service returns a non-2xx status', () => {
    it('should throw an error so the circuit breaker records a failure', async () => {
      global.fetch = mockFetch({}, 500);
      await expect(client.evaluate(BASE_REQ)).rejects.toThrow('Risk service returned HTTP 500');
    });
  });
});

describe('Given the risk service URL is not configured', () => {
  let client: RiskHttpClient;

  beforeEach(async () => {
    delete process.env['RISK_SERVICE_URL'];
    process.env['RISK_SERVICE_TIMEOUT_MS'] = '2000';
    process.env['INTERNAL_RISK_API_KEY'] = 'test-key';
    client = new RiskHttpClient();
    await client.onModuleInit();
  });

  describe('when evaluate is called', () => {
    it('should throw so the caller can handle fail-closed', async () => {
      global.fetch = mockFetch({}, 500);
      await expect(client.evaluate(BASE_REQ)).rejects.toThrow();
    });
  });
});
