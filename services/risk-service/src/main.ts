import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ReadinessService } from './app.readiness';

const SERVICE_NAME = 'risk-service';
const DEFAULT_PORT = 3003;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  // Security
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: process.env['CORS_ORIGIN'] ?? '*',
  });

  // OpenAPI stub
  const doc = new DocumentBuilder()
    .setTitle(SERVICE_NAME)
    .setDescription('PulseDesk ${SERVICE_NAME} — stub')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));

  // Graceful shutdown
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  const shutdownTimeoutMs = parseInt(
    process.env['SHUTDOWN_TIMEOUT_MS'] ?? '25000',
    10,
  );
  const armHardTimeout = (signal: string): void => {
    app.get(ReadinessService).setNotReady();
    logger.warn(
      `${signal} received — readiness NOT READY, hard timeout armed (${shutdownTimeoutMs}ms)`,
    );
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, shutdownTimeoutMs).unref();
  };

  process.once('SIGTERM', () => armHardTimeout('SIGTERM'));
  process.once('SIGINT', () => armHardTimeout('SIGINT'));

  const port = parseInt(process.env['PORT'] ?? String(DEFAULT_PORT), 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`${SERVICE_NAME} listening on port ${port}`);
}

void bootstrap();
