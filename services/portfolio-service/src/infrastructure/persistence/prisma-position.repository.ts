import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Position } from '../../domain/position.entity';
import { IPositionRepository } from '../../domain/ports/position-repository.port';
import { PrismaService, TransactionClient } from './prisma.provider';

@Injectable()
export class PrismaPositionRepository implements IPositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountAndSymbol(accountId: string, symbol: string): Promise<Position | null> {
    const record = await this.prisma.position.findUnique({
      where: { accountId_symbol: { accountId, symbol } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByAccount(accountId: string): Promise<Position[]> {
    const records = await this.prisma.position.findMany({ where: { accountId } });
    return records.map((r) => this.toDomain(r));
  }

  async savePositionWithFill(position: Position, executionId: string): Promise<'SAVED' | 'DUPLICATE'> {
    try {
      await this.prisma.$transaction(async (tx: TransactionClient) => {
        await tx.processedFill.create({ data: { executionId } });
        await tx.position.upsert({
          where: { accountId_symbol: { accountId: position.accountId, symbol: position.symbol } },
          create: {
            id: position.id,
            accountId: position.accountId,
            symbol: position.symbol,
            quantity: position.quantity,
            averageCost: position.averageCost,
          },
          update: {
            quantity: position.quantity,
            averageCost: position.averageCost,
          },
        });
      });
      return 'SAVED';
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return 'DUPLICATE';
      }
      throw err;
    }
  }

  private toDomain(record: {
    id: string;
    accountId: string;
    symbol: string;
    quantity: { toNumber(): number };
    averageCost: { toNumber(): number };
    updatedAt: Date;
  }): Position {
    return new Position({
      id: record.id,
      accountId: record.accountId,
      symbol: record.symbol,
      quantity: record.quantity.toNumber(),
      averageCost: record.averageCost.toNumber(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }
}
