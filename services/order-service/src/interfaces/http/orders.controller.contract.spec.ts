/**
 * QA — Contract spec for GET /v1/orders?accountId=
 *
 * Scope  : Response shape validation, required fields presence, 400 when
 *          accountId is missing or empty, and ordering of returned results.
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
    it('should return an array of order response DTOs', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder()]);

      const result = await controller.list('acc-contract-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should call the use case with the supplied accountId', async () => {
      getOrdersUseCase.execute.mockResolvedValue([]);

      await controller.list('acc-contract-001');

      expect(getOrdersUseCase.execute).toHaveBeenCalledWith('acc-contract-001');
    });

    it('should return an empty array when the account has no orders', async () => {
      getOrdersUseCase.execute.mockResolvedValue([]);

      const result = await controller.list('acc-no-orders');

      expect(result).toHaveLength(0);
    });
  });

  // ---- Response shape: required fields --------------------------------------

  describe('when accountId is provided and orders are returned', () => {
    it('should include id in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder({ id: 'order-shape-1' })]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].id).toBe('order-shape-1');
    });

    it('should include commandId in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder({ commandId: 'cmd-shape-1' })]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].commandId).toBe('cmd-shape-1');
    });

    it('should include status as a string in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder()]);

      const result = await controller.list('acc-contract-001');

      expect(typeof result[0].status).toBe('string');
      expect(result[0].status).toBe(OrderStatus.PENDING);
    });

    it('should include side in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([
        buildOrder({ side: OrderSide.SELL }),
      ]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].side).toBe(OrderSide.SELL);
    });

    it('should include type in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([
        buildOrder({ type: OrderType.LIMIT, limitPrice: 150 }),
      ]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].type).toBe(OrderType.LIMIT);
    });

    it('should include quantity as a number in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder({ quantity: 25 })]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].quantity).toBe(25);
      expect(typeof result[0].quantity).toBe('number');
    });

    it('should include ISO-8601 createdAt string in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder()]);

      const result = await controller.list('acc-contract-001');

      expect(typeof result[0].createdAt).toBe('string');
      expect(() => new Date(result[0].createdAt)).not.toThrow();
      expect(new Date(result[0].createdAt).toISOString()).toBe(result[0].createdAt);
    });

    it('should include ISO-8601 updatedAt string in each response DTO', async () => {
      getOrdersUseCase.execute.mockResolvedValue([buildOrder()]);

      const result = await controller.list('acc-contract-001');

      expect(typeof result[0].updatedAt).toBe('string');
      expect(() => new Date(result[0].updatedAt)).not.toThrow();
      expect(new Date(result[0].updatedAt).toISOString()).toBe(result[0].updatedAt);
    });

    it('should include limitPrice as a number for LIMIT orders', async () => {
      getOrdersUseCase.execute.mockResolvedValue([
        buildOrder({ type: OrderType.LIMIT, limitPrice: 175.5 }),
      ]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].limitPrice).toBe(175.5);
    });

    it('should set limitPrice to null for MARKET orders', async () => {
      getOrdersUseCase.execute.mockResolvedValue([
        buildOrder({ type: OrderType.MARKET }),
      ]);

      const result = await controller.list('acc-contract-001');

      expect(result[0].limitPrice).toBeNull();
    });
  });

  // ---- Multiple orders: correct count and shape ----------------------------

  describe('when accountId has multiple orders', () => {
    it('should return all orders in the response array', async () => {
      getOrdersUseCase.execute.mockResolvedValue([
        buildOrder({ id: 'order-m1', symbol: 'AAPL' }),
        buildOrder({ id: 'order-m2', symbol: 'MSFT' }),
        buildOrder({ id: 'order-m3', symbol: 'GOOGL' }),
      ]);

      const result = await controller.list('acc-contract-001');

      expect(result).toHaveLength(3);
      const symbols = result.map((r) => r.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('MSFT');
      expect(symbols).toContain('GOOGL');
    });

    it('should return all required fields for every order in the array', async () => {
      getOrdersUseCase.execute.mockResolvedValue([
        buildOrder({ id: 'order-s1' }),
        buildOrder({ id: 'order-s2' }),
      ]);

      const result = await controller.list('acc-contract-001');

      const requiredFields = ['id', 'commandId', 'accountId', 'symbol', 'side', 'type', 'quantity', 'status', 'createdAt', 'updatedAt'];
      for (const dto of result) {
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
      await controller.list(undefined as unknown as string).catch(() => {
        /* expected */
      });

      expect(getOrdersUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when accountId query parameter is an empty string', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('')).rejects.toThrow(BadRequestException);
    });

    it('should not call the use case when accountId is blank', async () => {
      await controller.list('').catch(() => {
        /* expected */
      });

      expect(getOrdersUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when accountId query parameter is whitespace only', () => {
    it('should throw BadRequestException', async () => {
      await expect(controller.list('   ')).rejects.toThrow(BadRequestException);
    });
  });
});
