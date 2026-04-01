import { Injectable, Logger } from "@nestjs/common";
import { RankingsService } from "./rankings.service";

@Injectable()
export class RankingsOrchestratorService {
  private readonly logger = new Logger(RankingsOrchestratorService.name);

  constructor(private readonly rankings: RankingsService) {}

  async triggerRecalculation(trigger: { source: string; boutId?: string }) {
    const queueEnabled = process.env.RANKINGS_USE_QUEUE === "true";

    // Queue boundary is kept explicit. If queue infra is not ready, we execute
    // a safe synchronous fallback to keep rankings fresh for MVP.
    if (queueEnabled) {
      this.logger.warn("Queue mode requested but queue worker is not configured; using sync fallback.");
    }

    return this.rankings.recalculateAll(trigger);
  }
}
