CREATE TABLE "executions" (
  "id"             TEXT        NOT NULL,
  "idempotencyKey" TEXT        NOT NULL,
  "orderId"        TEXT        NOT NULL,
  "accountId"      TEXT        NOT NULL,
  "symbol"         TEXT        NOT NULL,
  "side"           TEXT        NOT NULL,
  "filledQuantity" DECIMAL(18,8) NOT NULL,
  "fillPrice"      DECIMAL(18,8) NOT NULL,
  "filledAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "executions_idempotencyKey_key" ON "executions"("idempotencyKey");
CREATE INDEX "executions_orderId_idx" ON "executions"("orderId");
