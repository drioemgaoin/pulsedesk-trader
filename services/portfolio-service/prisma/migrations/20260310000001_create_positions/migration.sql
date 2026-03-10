CREATE TABLE "positions" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "quantity" DECIMAL(18,8) NOT NULL,
  "averageCost" DECIMAL(18,8) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "positions_accountId_symbol_key" ON "positions"("accountId","symbol");
CREATE INDEX "positions_accountId_idx" ON "positions"("accountId");

CREATE TABLE "processed_fills" (
  "executionId" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "processed_fills_pkey" PRIMARY KEY ("executionId")
);
