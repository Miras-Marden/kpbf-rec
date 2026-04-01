-- Initial schema for KPBF REC

-- Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'USER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ModerationStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RankingScope" AS ENUM ('WEIGHT_CATEGORY', 'P4P');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RankingStyle" AS ENUM ('ACTIVE', 'ALL_TIME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FightMethod" AS ENUM ('UD', 'SD', 'MD', 'KO', 'TKO', 'DQ', 'Draw', 'NC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FightOutcome" AS ENUM ('WIN', 'LOSS', 'DRAW', 'NC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- updatedAt helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

DROP TRIGGER IF EXISTS "User_set_updated_at" ON "User";
CREATE TRIGGER "User_set_updated_at"
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- UserRole
CREATE TABLE IF NOT EXISTS "UserRole" (
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  PRIMARY KEY ("userId", "role"),
  CONSTRAINT "UserRole_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- UserRefreshToken
CREATE TABLE IF NOT EXISTS "UserRefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  PRIMARY KEY ("id"),
  CONSTRAINT "UserRefreshToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "UserRefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "note" TEXT,
  PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- WeightCategory
CREATE TABLE IF NOT EXISTS "WeightCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "weightKg" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeightCategory_slug_key" ON "WeightCategory"("slug");

DROP TRIGGER IF EXISTS "WeightCategory_set_updated_at" ON "WeightCategory";
CREATE TRIGGER "WeightCategory_set_updated_at"
BEFORE UPDATE ON "WeightCategory"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Fighter
CREATE TABLE IF NOT EXISTS "Fighter" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "photoUrl" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "nationality" TEXT,
  "regionCity" TEXT,
  "heightCm" INTEGER,
  "reachCm" INTEGER,
  "stance" TEXT,
  "weightCategoryId" TEXT,
  "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
  "moderationNote" TEXT,
  "approvedByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "Fighter_slug_key" UNIQUE ("slug"),
  CONSTRAINT "Fighter_weightCategoryId_fkey"
    FOREIGN KEY ("weightCategoryId") REFERENCES "WeightCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Fighter_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Fighter_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"),
  CONSTRAINT "Fighter_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
);

DROP TRIGGER IF EXISTS "Fighter_set_updated_at" ON "Fighter";
CREATE TRIGGER "Fighter_set_updated_at"
BEFORE UPDATE ON "Fighter"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Event
CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "eventDate" TIMESTAMP(3),
  "city" TEXT,
  "country" TEXT,
  "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
  "moderationNote" TEXT,
  "approvedByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "Event_slug_key" UNIQUE ("slug"),
  CONSTRAINT "Event_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Event_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"),
  CONSTRAINT "Event_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
);

DROP TRIGGER IF EXISTS "Event_set_updated_at" ON "Event";
CREATE TRIGGER "Event_set_updated_at"
BEFORE UPDATE ON "Event"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Bout
CREATE TABLE IF NOT EXISTS "Bout" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "boutDate" TIMESTAMP(3) NOT NULL,
  "weightCategoryId" TEXT,
  "fighterAId" TEXT NOT NULL,
  "fighterBId" TEXT NOT NULL,
  "result" "FightOutcome" NOT NULL,
  "method" "FightMethod" NOT NULL,
  "venue" TEXT,
  "city" TEXT,
  "country" TEXT,
  "eventId" TEXT,
  "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
  "moderationNote" TEXT,
  "approvedByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "referee" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "Bout_slug_key" UNIQUE ("slug"),
  CONSTRAINT "Bout_weightCategoryId_fkey"
    FOREIGN KEY ("weightCategoryId") REFERENCES "WeightCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Bout_fighterAId_fkey"
    FOREIGN KEY ("fighterAId") REFERENCES "Fighter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Bout_fighterBId_fkey"
    FOREIGN KEY ("fighterBId") REFERENCES "Fighter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Bout_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Bout_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Bout_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"),
  CONSTRAINT "Bout_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
);

DROP TRIGGER IF EXISTS "Bout_set_updated_at" ON "Bout";
CREATE TRIGGER "Bout_set_updated_at"
BEFORE UPDATE ON "Bout"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- JudgesScore
CREATE TABLE IF NOT EXISTS "JudgesScore" (
  "id" TEXT NOT NULL,
  "boutId" TEXT NOT NULL,
  "judgeName" TEXT NOT NULL,
  "roundsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "JudgesScore_boutId_fkey"
    FOREIGN KEY ("boutId") REFERENCES "Bout"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "JudgesScore_boutId_idx" ON "JudgesScore"("boutId");

-- News
CREATE TABLE IF NOT EXISTS "News" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "contentMd" TEXT,
  "coverPhotoUrl" TEXT,
  "eventId" TEXT,
  "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
  "moderationNote" TEXT,
  "approvedByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "News_slug_key" UNIQUE ("slug"),
  CONSTRAINT "News_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "News_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "News_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"),
  CONSTRAINT "News_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
);

DROP TRIGGER IF EXISTS "News_set_updated_at" ON "News";
CREATE TRIGGER "News_set_updated_at"
BEFORE UPDATE ON "News"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- NewsFighter join table
CREATE TABLE IF NOT EXISTS "NewsFighter" (
  "newsId" TEXT NOT NULL,
  "fighterId" TEXT NOT NULL,
  PRIMARY KEY ("newsId", "fighterId"),
  CONSTRAINT "NewsFighter_newsId_fkey"
    FOREIGN KEY ("newsId") REFERENCES "News"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NewsFighter_fighterId_fkey"
    FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- MediaFile
CREATE TABLE IF NOT EXISTS "MediaFile" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "filename" TEXT,
  "sizeBytes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- RankingCurrent
CREATE TABLE IF NOT EXISTS "RankingCurrent" (
  "id" TEXT NOT NULL,
  "scope" "RankingScope" NOT NULL,
  "style" "RankingStyle" NOT NULL,
  "fighterId" TEXT NOT NULL,
  "weightCategoryId" TEXT,
  "rating" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL,
  "methodologyVersion" TEXT NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "RankingCurrent_fighterId_fkey"
    FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RankingCurrent_weightCategoryId_fkey"
    FOREIGN KEY ("weightCategoryId") REFERENCES "WeightCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RankingCurrent_scope_style_fighterId_weightCategoryId_key"
ON "RankingCurrent"("scope", "style", "fighterId", "weightCategoryId");

-- RankingSnapshot
CREATE TABLE IF NOT EXISTS "RankingSnapshot" (
  "id" TEXT NOT NULL,
  "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scope" "RankingScope" NOT NULL,
  "style" "RankingStyle" NOT NULL,
  "fighterId" TEXT NOT NULL,
  "weightCategoryId" TEXT,
  "rating" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL,
  "methodologyVersion" TEXT NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "RankingSnapshot_fighterId_fkey"
    FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RankingSnapshot_weightCategoryId_fkey"
    FOREIGN KEY ("weightCategoryId") REFERENCES "WeightCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RankingSnapshot_snapshotAt_scope_style_idx"
ON "RankingSnapshot"("snapshotAt", "scope", "style");

CREATE UNIQUE INDEX IF NOT EXISTS "RankingSnapshot_snapshotAt_scope_style_fighterId_weightCategoryId_key"
ON "RankingSnapshot"("snapshotAt", "scope", "style", "fighterId", "weightCategoryId");

