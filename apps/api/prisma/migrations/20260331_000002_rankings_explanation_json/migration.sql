-- Alter ranking tables to persist explainable components.
ALTER TABLE "RankingCurrent"
ADD COLUMN "explanationJson" JSONB;

ALTER TABLE "RankingSnapshot"
ADD COLUMN "explanationJson" JSONB;
