/**
 * QA — Contract spec for GET /v1/orders?accountId=
 *
 * Scope  : Response shape validation, required fields presence,
 *          pagination meta, status filtering, and 400 when accountId is
 *          missing/empty or when limit/offset/status are invalid.
 * Style  : describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 * Notes  : Uses NestJS TestingModule with mocked use-cases — no HTTP server.
 */

import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { SubmitOrderUseCase } from '../../application/use-cases/submit-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from '../../application/use-cases/get-orders.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { OrderType } from '../../domain/enums/order-type.enum';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function buildOrder(overrides: {
  id?: string;
  commandId?: string;
  symbol?: string;
  side?: OrderSide;
  type?: OrderType;
  quantity?: number;
  limitPrice?: number;
} = {}): Order {
  return Order.create({
    id: overrides.id ?? 'order-contract-1',
    commandId: overrides.commandId ?? 'cmd-contract-1',
    accountId: 'acc-contract-001',
    symbol: overrides.symbol ?? 'AAPL',
    side: overrides.side ?? OrderSide.BUY,
    type: overrides.type ?? OrderType.MARKET,
    quantity: overrides.quantity ?? 10,
    limitPrice: overrides.limitPrice,
  });
}

function makePageResult(orders: Order[], total?: number) {
  return { orders, total: total ?? orders.length, limit: 50, offset: 0 };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrdersController — GET /v1/orders?accountId= (contract)', () => {
  let controller: OrdersController;
  let getOrdersUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    getOrdersUseCase = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: SubmitOrderUseCase, useValue: { execute: jest.fn() } },
        { provide: GetOrderUseCase, useValue: { execute: jest.fn() } },
        { provide: GetOrdersUseCase, useValue: getOrdersUseCase },
      ],
    }).compile();

    controller = module.get(OrdersController);
  });

  // ---- Happy path: accountId present ----------------------------------------

  describe('when accountId query parameter is provided', () => {
    it('should return a paginated response with orders and pagination meta', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder()]));

      const result = await controller.list('acc-contract-001');

      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.pagination).toBeDefined();
    });

    it('should call the use case with the supplied accountId and default pagination', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([]));

      await controller.list('acc-contract-001');

      expect(getOrdersUseCase.execute).toHaveBeenCalledWith({
        accountId: 'acc-contract-001',
        status: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should return empty orders array when the account has no orders', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([], 0));

      const result = await controller.list('acc-no-orders');

      expect(result.orders).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ---- Pagination meta -------------------------------------------------------

  describe('when the use case returns pagination data', () => {
    it('should expose limit in the pagination meta', async () => {
      getOrdersUseCase.execute.mockResolvedValue({ orders: [], total: 42, limit: 10, offset: 0 });

      const result = await controller.list('acc-001', undefined, '10', '0');

      expect(result.pagination.limit).toBe(10);
    });

    it('should expose offset in the pagination meta', async () => {
      getOrdersUseCase.execute.mockResolvedValue({ orders: [], total: 42, limit: 50, offset: 20 });

      const result = await controller.list('acc-001', undefined, undefined, '20');

      expect(result.pagination.offset).toBe(20);
    });

    it('should expose total in the pagination meta', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder()], 99));

      const result = await controller.list('acc-001');

      expect(result.pagination.total).toBe(99);
    });
  });

  // ---- Status filter ---------------------------------------------------------

  describe('when a valid status filter is provided', () => {
    it('should pass the status to the use case', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([]));

      await controller.list('acc-001', 'FILLED');

      expect(getOrdersUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FILLED' }),
      );
    });
  });

  describe('when an invalid status is provided', () => {
    it('should throw BadRequestException', async () => {
      await expect(
        controller.list('acc-001', 'UNKNOWN_STATUS'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---- Limit / offset validation ---------------------------------------------

  describe('when limit is below 1', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('acc-001', undefined, '0')).rejects.toThrow(BadRequestException);
    });
  });

  describe('when limit exceeds 200', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('acc-001', undefined, '201')).rejects.toThrow(BadRequestException);
    });
  });

  describe('when offset is negative', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('acc-001', undefined, undefined, '-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ---- Response shape: required fields --------------------------------------

  describe('when accountId is provided and orders are returned', () => {
    it('should include id in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ id: 'order-shape-1' })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].id).toBe('order-shape-1');
    });

    it('should include commandId in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ commandId: 'cmd-shape-1' })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].commandId).toBe('cmd-shape-1');
    });

    it('should include status as a string in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder()]));

      const result = await controller.list('acc-contract-001');

      expect(typeof result.orders[0].status).toBe('string');
      expect(result.orders[0].status).toBe(OrderStatus.PENDING);
    });

    it('should include side in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ side: OrderSide.SELL })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].side).toBe(OrderSide.SELL);
    });

    it('should include type in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ type: OrderType.LIMIT, limitPrice: 150 })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].type).toBe(OrderType.LIMIT);
    });

    it('should include quantity as a number in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ quantity: 25 })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].quantity).toBe(25);
      expect(typeof result.orders[0].quantity).toBe('number');
    });

    it('should include ISO-8601 createdAt string in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder()]));

      const result = await controller.list('acc-contract-001');

      expect(typeof result.orders[0].createdAt).toBe('string');
      expect(new Date(result.orders[0].createdAt).toISOString()).toBe(result.orders[0].createdAt);
    });

    it('should include ISO-8601 updatedAt string in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder()]));

      const result = await controller.list('acc-contract-001');

      expect(typeof result.orders[0].updatedAt).toBe('string');
      expect(new Date(result.orders[0].updatedAt).toISOString()).toBe(result.orders[0].updatedAt);
    });

    it('should include limitPrice as a number for LIMIT orders', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ type: OrderType.LIMIT, limitPrice: 175.5 })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].limitPrice).toBe(175.5);
    });

    it('should set limitPrice to null for MARKET orders', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([buildOrder({ type: OrderType.MARKET })]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders[0].limitPrice).toBeNull();
    });
  });

  // ---- Multiple orders -------------------------------------------------------

  describe('when accountId has multiple orders', () => {
    it('should return all orders in the response array', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([
        buildOrder({ id: 'order-m1', symbol: 'AAPL' }),
        buildOrder({ id: 'order-m2', symbol: 'MSFT' }),
        buildOrder({ id: 'order-m3', symbol: 'GOOGL' }),
      ]));

      const result = await controller.list('acc-contract-001');

      expect(result.orders).toHaveLength(3);
      const symbols = result.orders.map((r) => r.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('MSFT');
      expect(symbols).toContain('GOOGL');
    });

    it('should return all required fields for every order in the array', async () => {
      getOrdersUseCase.execute.mockResolvedValue(makePageResult([
        buildOrder({ id: 'order-s1' }),
        buildOrder({ id: 'order-s2' }),
      ]));

      const result = await controller.list('acc-contract-001');

      const requiredFields = ['id', 'commandId', 'accountId', 'symbol', 'side', 'type', 'quantity', 'status', 'createdAt', 'updatedAt'];
      for (const dto of result.orders) {
        for (const field of requiredFields) {
          expect(dto).toHaveProperty(field);
          expect((dto as unknown as Record<string, unknown>)[field]).not.toBeUndefined();
        }
      }
    });
  });

  // ---- Missing / empty accountId returns 400 --------------------------------

  describe('when accountId query parameter is missing', () => {
    it('should throw BadRequestException', async () => {
      await expect(
        controller.list(undefined as unknown as string),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not call the use case when accountId is absent', async () => {
      await controller.list(undefined as unknown as string).catch(() => { /* expected */ });

      expect(getOrdersUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when accountId query parameter is an empty string', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('')).rejects.toThrow(BadRequestException);
    });

    it('should not call the use case when accountId is blank', async () => {
      await controller.list('').catch(() => { /* expected */ });

      expect(getOrdersUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when accountId query parameter is whitespace only', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('   ')).rejects.toThrow(BadRequestException);
    });
  });
});
