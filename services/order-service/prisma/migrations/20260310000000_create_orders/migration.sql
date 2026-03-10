-- CreateTable
CREATE TABLE "orders" (
    "id"              TEXT         NOT NULL,
    "commandId"       TEXT         NOT NULL,
    "symbol"          TEXT         NOT NULL,
    "side"            TEXT         NOT NULL,
    "type"            TEXT         NOT NULL,
    "quantity"        DECIMAL(18,8) NOT NULL,
    "limitPrice"      DECIMAL(18,8),
    "status"          TEXT         NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_commandId_key" ON "orders"("commandId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");
