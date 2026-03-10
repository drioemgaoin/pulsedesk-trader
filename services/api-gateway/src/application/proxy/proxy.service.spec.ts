import { BadGatewayException, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAxiosResponse<T = unknown> = { data: T; status: number; statusText: string; headers: any; config: any };
import { TimeoutError } from 'rxjs';
import { ProxyService } from './proxy.service';
import type { FastifyRequest } from 'fastify';

const makeReq = (headers: Record<string, string> = {}): FastifyRequest =>
  ({ headers } as unknown as FastifyRequest);

describe('Given a ProxyService instance', () => {
  let service: ProxyService;
  let http: jest.Mocked<HttpService>;

  beforeEach(() => {
    http = { request: jest.fn() } as unknown as jest.Mocked<HttpService>;
    service = new ProxyService(http);
  });

  describe('when forwarding a request with correlation headers', () => {
    it('should include x-request-id and traceparent in the upstream call', async () => {
      http.request.mockReturnValue(
        of({ data: { ok: true } } as unknown as MockAxiosResponse),
      );
      const req = makeReq({ 'x-request-id': 'abc', traceparent: 'tp-val' });
      await service.forward(req, 'http://svc/path', 'GET');
      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'x-request-id': 'abc', traceparent: 'tp-val' },
        }),
      );
    });
  });

  describe('when the upstream responds successfully', () => {
    it('should return the upstream response data', async () => {
      http.request.mockReturnValue(of({ data: { id: '1' } } as unknown as MockAxiosResponse));
      const result = await service.forward(makeReq(), 'http://svc/path', 'GET');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('when the upstream times out', () => {
    it('should throw BadGatewayException', async () => {
      http.request.mockReturnValue(throwError(() => new TimeoutError()));
      await expect(service.forward(makeReq(), 'http://svc', 'GET')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('when the upstream returns a 4xx error', () => {
    it('should rethrow as HttpException with sanitised body', async () => {
      const err = {
        response: { status: 404, data: { message: 'Not found', stack: 'internal' } },
      };
      http.request.mockReturnValue(throwError(() => err));
      await expect(service.forward(makeReq(), 'http://svc', 'GET')).rejects.toMatchObject(
        new HttpException({ statusCode: 404, message: 'Not found' }, 404),
      );
    });

    it('should strip stack traces from the error body', async () => {
      const err = {
        response: { status: 500, data: { stack: 'Error at line 42', message: 'DB error' } },
      };
      http.request.mockReturnValue(throwError(() => err));
      try {
        await service.forward(makeReq(), 'http://svc', 'GET');
      } catch (e) {
        const body = (e as HttpException).getResponse() as Record<string, unknown>;
        expect(body['stack']).toBeUndefined();
        expect(body['message']).toBe('DB error');
      }
    });
  });

  describe('when the upstream error body has no message field', () => {
    it('should return a generic upstream error message', async () => {
      const err = { response: { status: 503, data: 'plain string error' } };
      http.request.mockReturnValue(throwError(() => err));
      try {
        await service.forward(makeReq(), 'http://svc', 'GET');
      } catch (e) {
        const body = (e as HttpException).getResponse() as Record<string, unknown>;
        expect(body['message']).toBe('Upstream request failed');
      }
    });
  });
});
