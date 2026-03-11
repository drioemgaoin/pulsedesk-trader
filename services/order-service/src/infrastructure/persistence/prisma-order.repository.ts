import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { IOrderRepository } from '../../domain/ports/order-repository.port';
import { PrismaService } from './prisma.provider';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(order: Order): Promise<Order> {
    const record = await this.prisma.order.upsert({
      where: { id: order.id },
      create: {
        id: order.id,
        commandId: order.commandId,
        accountId: order.accountId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        limitPrice: order.limitPrice,
        status: order.status,
        rejectionReason: order.rejectionReason,
      },
      update: {
        status: order.status,
        rejectionReason: order.rejectionReason,
        updatedAt: order.updatedAt,
      },
    });
    return this.toDomain(record);
  }

  async findByCommandId(commandId: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({ where: { commandId } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findAllByAccount(accountId: string): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    commandId: string;
    accountId: string;
    symbol: string;
    side: string;
    type: string;
    quantity: { toNumber(): number };
    limitPrice: { toNumber(): number } | null;
    status: string;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Order {
    return new Order({
      id: record.id,
      commandId: record.commandId,
      accountId: record.accountId,
      symbol: record.symbol,
      side: record.side as OrderSide,
      type: record.type as OrderType,
      quantity: record.quantity.toNumber(),
      limitPrice: record.limitPrice ? record.limitPrice.toNumber() : null,
      status: record.status as OrderStatus,
      rejectionReason: record.rejectionReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
