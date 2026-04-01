import { Module } from "@nestjs/common";
import { PublicRankingsController } from "./public-rankings.controller";
import { RankingsService } from "./rankings.service";
import { RankingsOrchestratorService } from "./rankings-orchestrator.service";

@Module({
  controllers: [PublicRankingsController],
  providers: [RankingsService, RankingsOrchestratorService],
  exports: [RankingsService, RankingsOrchestratorService]
})
export class RankingsModule {}
