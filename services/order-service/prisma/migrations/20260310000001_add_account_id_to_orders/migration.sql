-- Migration: add accountId to orders
-- Default '' for existing rows; application always supplies a non-empty value going forward.
ALTER TABLE "orders" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT '';
