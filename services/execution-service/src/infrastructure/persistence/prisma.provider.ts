import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly client: PrismaClient;

  constructor() {
    this.pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
  }

  get execution(): PrismaClient['execution'] {
    return this.client.execution;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
    this.logger.log('Prisma disconnected');
  }
}
