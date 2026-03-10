import { Injectable } from '@nestjs/common';
import { Execution } from '../../domain/execution.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { IExecutionRepository } from '../../domain/ports/execution-repository.port';
import { PrismaService } from './prisma.provider';

@Injectable()
export class PrismaExecutionRepository implements IExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(execution: Execution): Promise<Execution> {
    const record = await this.prisma.execution.create({
      data: {
        id: execution.id,
        idempotencyKey: execution.idempotencyKey,
        orderId: execution.orderId,
        accountId: execution.accountId,
        symbol: execution.symbol,
        side: execution.side,
        filledQuantity: execution.filledQuantity,
        fillPrice: execution.fillPrice,
        filledAt: new Date(execution.filledAt),
      },
    });
    return this.toDomain(record);
  }

  async findByIdempotencyKey(key: string): Promise<Execution | null> {
    const record = await this.prisma.execution.findUnique({ where: { idempotencyKey: key } });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: {
    id: string;
    idempotencyKey: string;
    orderId: string;
    accountId: string;
    symbol: string;
    side: string;
    filledQuantity: { toNumber(): number };
    fillPrice: { toNumber(): number };
    filledAt: Date;
  }): Execution {
    return new Execution({
      id: record.id,
      idempotencyKey: record.idempotencyKey,
      orderId: record.orderId,
      accountId: record.accountId,
      symbol: record.symbol,
      side: record.side as OrderSide,
      filledQuantity: record.filledQuantity.toNumber(),
      fillPrice: record.fillPrice.toNumber(),
      filledAt: record.filledAt.toISOString(),
    });
  }
}
