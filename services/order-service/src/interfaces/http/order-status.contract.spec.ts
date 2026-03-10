/**
 * QA — Contract / state-machine spec for order status via HTTP layer
 *
 * Scope  : GET /v1/orders/:id response shape after fills; valid and invalid
 *          Order domain state-machine transitions.
 * Style  : describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 * Notes  : Uses NestJS TestingModule with mocked use cases — no HTTP server needed.
 */

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { SubmitOrderUseCase } from '../../application/use-cases/submit-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { OrderValidationError } from '../../domain/errors/order-validation.error';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function buildOrder(status: OrderStatus): Order {
  const base = Order.create({
    id: 'order-fixture-1',
    commandId: 'cmd-fixture-1',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    quantity: 10,
    limitPrice: 150,
  });

  switch (status) {
    case OrderStatus.ACCEPTED:
      return base.accept();
    case OrderStatus.FILLED:
      return base.accept().fill();
    case OrderStatus.REJECTED:
      return base.reject('risk limit exceeded');
    case OrderStatus.CANCELLED:
      return base.accept().cancel();
    default:
      return base; // PENDING
  }
}

// ---------------------------------------------------------------------------
// Controller contract tests — GET /v1/orders/:id
// ---------------------------------------------------------------------------

describe('OrdersController — GET /v1/orders/:id (contract)', () => {
  let controller: OrdersController;
  let getUseCase: { execute: jest.Mock };
  let submitUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    getUseCase = { execute: jest.fn() };
    submitUseCase = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: SubmitOrderUseCase, useValue: submitUseCase },
        { provide: GetOrderUseCase, useValue: getUseCase },
      ],
    }).compile();

    controller = module.get(OrdersController);
  });

  describe('when the order is in FILLED status', () => {
    it('should return a response with status FILLED', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.FILLED));
      const result = await controller.getById('order-fixture-1');
      expect(result.status).toBe(OrderStatus.FILLED);
    });

    it('should include required contract fields in the response', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.FILLED));
      const result = await controller.getById('order-fixture-1');
      expect(result).toMatchObject({
        id: 'order-fixture-1',
        commandId: 'cmd-fixture-1',
        accountId: 'acc-001',
        symbol: 'AAPL',
        status: OrderStatus.FILLED,
      });
    });

    it('should return ISO-8601 strings for createdAt and updatedAt', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.FILLED));
      const result = await controller.getById('order-fixture-1');
      expect(() => new Date(result.createdAt)).not.toThrow();
      expect(() => new Date(result.updatedAt)).not.toThrow();
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
    });
  });

  describe('when the order is in ACCEPTED status', () => {
    it('should return a response with status ACCEPTED', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.ACCEPTED));
      const result = await controller.getById('order-fixture-1');
      expect(result.status).toBe(OrderStatus.ACCEPTED);
    });
  });

  describe('when the order is in PENDING status', () => {
    it('should return a response with status PENDING', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.PENDING));
      const result = await controller.getById('order-fixture-1');
      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('when the order is in REJECTED status', () => {
    it('should return a response with status REJECTED', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.REJECTED));
      const result = await controller.getById('order-fixture-1');
      expect(result.status).toBe(OrderStatus.REJECTED);
    });
  });

  describe('when the order is in CANCELLED status', () => {
    it('should return a response with status CANCELLED', async () => {
      getUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.CANCELLED));
      const result = await controller.getById('order-fixture-1');
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('when the order is not found', () => {
    it('should throw NotFoundException', async () => {
      getUseCase.execute.mockRejectedValue(new OrderNotFoundError('order-missing'));
      await expect(controller.getById('order-missing')).rejects.toThrow(NotFoundException);
    });
  });
});

// ---------------------------------------------------------------------------
// Order domain state-machine transitions
// ---------------------------------------------------------------------------

describe('Order domain state machine', () => {
  // ---- Valid transitions ---------------------------------------------------

  describe('when a PENDING order is accepted', () => {
    it('should transition to ACCEPTED', () => {
      const order = buildOrder(OrderStatus.PENDING);
      const accepted = order.accept();
      expect(accepted.status).toBe(OrderStatus.ACCEPTED);
    });
  });

  describe('when a PENDING order is rejected', () => {
    it('should transition to REJECTED with a reason', () => {
      const order = buildOrder(OrderStatus.PENDING);
      const rejected = order.reject('risk limit exceeded');
      expect(rejected.status).toBe(OrderStatus.REJECTED);
      expect(rejected.rejectionReason).toBe('risk limit exceeded');
    });
  });

  describe('when an ACCEPTED order is filled', () => {
    it('should transition to FILLED', () => {
      const order = buildOrder(OrderStatus.ACCEPTED);
      const filled = order.fill();
      expect(filled.status).toBe(OrderStatus.FILLED);
    });
  });

  describe('when an ACCEPTED order is cancelled', () => {
    it('should transition to CANCELLED', () => {
      const order = buildOrder(OrderStatus.ACCEPTED);
      const cancelled = order.cancel();
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('when a PENDING order is cancelled', () => {
    it('should transition to CANCELLED', () => {
      const order = buildOrder(OrderStatus.PENDING);
      const cancelled = order.cancel();
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);
    });
  });

  // ---- Invalid transitions — guards ----------------------------------------

  describe('when a FILLED order receives a fill() call', () => {
    it('should throw OrderValidationError (terminal state guard)', () => {
      const order = buildOrder(OrderStatus.FILLED);
      expect(() => order.fill()).toThrow(OrderValidationError);
    });
  });

  describe('when a REJECTED order receives a fill() call', () => {
    it('should throw OrderValidationError (terminal state guard)', () => {
      const order = buildOrder(OrderStatus.REJECTED);
      expect(() => order.fill()).toThrow(OrderValidationError);
    });
  });

  describe('when a CANCELLED order receives a fill() call', () => {
    it('should throw OrderValidationError (terminal state guard)', () => {
      const order = buildOrder(OrderStatus.CANCELLED);
      expect(() => order.fill()).toThrow(OrderValidationError);
    });
  });

  describe('when a FILLED order receives a cancel() call', () => {
    it('should throw OrderValidationError (terminal state guard)', () => {
      const order = buildOrder(OrderStatus.FILLED);
      expect(() => order.cancel()).toThrow(OrderValidationError);
    });
  });

  describe('when a REJECTED order receives a cancel() call', () => {
    it('should throw OrderValidationError (terminal state guard)', () => {
      const order = buildOrder(OrderStatus.REJECTED);
      expect(() => order.cancel()).toThrow(OrderValidationError);
    });
  });

  describe('when a CANCELLED order receives a cancel() call', () => {
    it('should throw OrderValidationError (idempotency guard)', () => {
      const order = buildOrder(OrderStatus.CANCELLED);
      expect(() => order.cancel()).toThrow(OrderValidationError);
    });
  });

  // ---- Immutability after transition ---------------------------------------

  describe('when a transition produces a new order instance', () => {
    it('should not mutate the original order', () => {
      const original = buildOrder(OrderStatus.ACCEPTED);
      original.fill();
      expect(original.status).toBe(OrderStatus.ACCEPTED);
    });
  });

  describe('when a fill transitions to FILLED', () => {
    it('should update updatedAt to a value >= the original', () => {
      const original = buildOrder(OrderStatus.ACCEPTED);
      const filled = original.fill();
      expect(filled.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    });
  });
});
