-- Nelvest initial schema (equivalent to prisma/schema.prisma). Applied to Supabase as a migration.
CREATE TYPE "Role" AS ENUM ('INVESTOR', 'ADMIN');
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'OPERATOR', 'KYC_REVIEWER', 'VIEWER');
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE "AccountMode" AS ENUM ('MANAGED', 'BYO');
CREATE TYPE "BotState" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');
CREATE TYPE "TradeMode" AS ENUM ('PAPER', 'TESTNET', 'LIVE');
CREATE TYPE "Side" AS ENUM ('BUY', 'SELL');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT,
  "role" "Role" NOT NULL DEFAULT 'INVESTOR',
  "adminRole" "AdminRole",
  "totpSecretEnc" TEXT,
  "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "RiskProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "experience" TEXT NOT NULL,
  "drawdownAction" TEXT NOT NULL,
  "sourceOfFunds" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RiskProfile_userId_key" ON "RiskProfile"("userId");

CREATE TABLE "KycSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "idType" TEXT NOT NULL,
  "idNumberHash" TEXT NOT NULL,
  "idNumberLast4" TEXT NOT NULL,
  "dateOfBirth" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "providerResult" JSONB,
  "reviewerId" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KycSubmission_status_idx" ON "KycSubmission"("status");

CREATE TABLE "InvestmentAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mode" "AccountMode" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "cashUsdt" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "holdings" JSONB NOT NULL DEFAULT '{}',
  "peakValueUsdt" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "depositedUsdt" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "budgetUsdt" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "riskLevel" TEXT NOT NULL DEFAULT 'Balanced',
  "stopDrawdownPct" INTEGER NOT NULL DEFAULT 15,
  "pausedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvestmentAccount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InvestmentAccount_userId_idx" ON "InvestmentAccount"("userId");

CREATE TABLE "ExchangeConnection" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "exchange" TEXT NOT NULL,
  "apiKeyEnc" TEXT NOT NULL,
  "apiSecretEnc" TEXT NOT NULL,
  "keyHint" TEXT NOT NULL,
  "canTrade" BOOLEAN NOT NULL DEFAULT false,
  "canWithdraw" BOOLEAN,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "statusDetail" TEXT,
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExchangeConnection_accountId_key" ON "ExchangeConnection"("accountId");

CREATE TABLE "BotConfig" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "state" "BotState" NOT NULL DEFAULT 'PAUSED',
  "strategy" TEXT NOT NULL DEFAULT 'balanced_momentum',
  "timeframe" TEXT NOT NULL DEFAULT '4h',
  "pairs" TEXT[] DEFAULT ARRAY['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT']::TEXT[],
  "maxPositionPct" DECIMAL(6,2) NOT NULL DEFAULT 5,
  "drawdownPausePct" DECIMAL(6,2) NOT NULL DEFAULT 15,
  "minConfidence" DECIMAL(4,3) NOT NULL DEFAULT 0.62,
  "dailyTradeCap" INTEGER NOT NULL DEFAULT 24,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Signal" (
  "id" TEXT NOT NULL,
  "pair" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "confidence" DECIMAL(4,3) NOT NULL,
  "price" DECIMAL(20,8) NOT NULL,
  "features" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Signal_pair_createdAt_idx" ON "Signal"("pair", "createdAt");

CREATE TABLE "Trade" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "pair" TEXT NOT NULL,
  "side" "Side" NOT NULL,
  "qty" DECIMAL(28,12) NOT NULL,
  "price" DECIMAL(20,8) NOT NULL,
  "feeUsdt" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "mode" "TradeMode" NOT NULL,
  "reason" TEXT NOT NULL,
  "confidence" DECIMAL(4,3),
  "exchangeOrderId" TEXT,
  "realizedPnlUsdt" DECIMAL(20,8),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Trade_accountId_createdAt_idx" ON "Trade"("accountId", "createdAt");

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "amount" DECIMAL(28,12) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reference" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LedgerEntry_reference_key" ON "LedgerEntry"("reference");

CREATE TABLE "AdminInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminInvite_tokenHash_key" ON "AdminInvite"("tokenHash");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "detail" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE "EngineRun" (
  "id" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "mode" "TradeMode" NOT NULL,
  "summary" JSONB,
  "error" TEXT,
  CONSTRAINT "EngineRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvestmentAccount" ADD CONSTRAINT "InvestmentAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExchangeConnection" ADD CONSTRAINT "ExchangeConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestmentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase exposes the public schema over its REST API. Nelvest never uses that API,
-- so turn on row-level security with no policies: the API sees nothing, while the app
-- (connecting as the database owner through Prisma) is unaffected.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KycSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvestmentAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExchangeConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BotConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EngineRun" ENABLE ROW LEVEL SECURITY;
