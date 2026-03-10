import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { SubmitOrderDto } from './dto/submit-order.dto';

const PENDING_ORDER = Order.create({
  id: 'order-id-1',
  commandId: 'cmd-id-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 10,
  limitPrice: 150,
});

const VALID_DTO: SubmitOrderDto = {
  commandId: 'cmd-id-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 10,
  limitPrice: 150,
};

describe('Given the order service is available', () => {
  let controller: OrdersController;
  let submitUseCase: { execute: jest.Mock };
  let getUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    submitUseCase = { execute: jest.fn() };
    getUseCase = { execute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: SubmitOrderUseCase, useValue: submitUseCase },
        { provide: GetOrderUseCase, useValue: getUseCase },
      ],
    }).compile();

    controller = module.get(OrdersController);
  });

  describe('when POST /v1/orders is called with a valid new order', () => {
    it('should return the created PENDING order', async () => {
      submitUseCase.execute.mockResolvedValue({ order: PENDING_ORDER, created: true });
      const result = await controller.submit(VALID_DTO);
      expect(result.id).toBe('order-id-1');
      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('when POST /v1/orders is called with a previously used commandId', () => {
    it('should return the existing order without creating a duplicate', async () => {
      submitUseCase.execute.mockResolvedValue({ order: PENDING_ORDER, created: false });
      const result = await controller.submit(VALID_DTO);
      expect(result.commandId).toBe('cmd-id-1');
    });
  });

  describe('when POST /v1/orders is called with an invalid payload', () => {
    it('should throw BadRequestException', async () => {
      submitUseCase.execute.mockRejectedValue(new OrderValidationError('bad input'));
      await expect(controller.submit(VALID_DTO)).rejects.toThrow(BadRequestException);
    });
  });

  describe('when GET /v1/orders/:id is called with a known order ID', () => {
    it('should return the order with the correct symbol', async () => {
      getUseCase.execute.mockResolvedValue(PENDING_ORDER);
      const result = await controller.getById('order-id-1');
      expect(result.symbol).toBe('AAPL');
    });
  });

  describe('when GET /v1/orders/:id is called with an unknown order ID', () => {
    it('should throw NotFoundException', async () => {
      getUseCase.execute.mockRejectedValue(new OrderNotFoundError('missing'));
      await expect(controller.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
