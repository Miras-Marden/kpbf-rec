import { Module } from "@nestjs/common";
import { AdminAuditLogsController } from "./audit-logs/admin-audit-logs.controller";
import { AdminFightersController } from "./fighters/admin-fighters.controller";
import { AdminEventsController } from "./events/admin-events.controller";
import { AdminBoutsController } from "./bouts/admin-bouts.controller";
import { RankingsModule } from "../rankings/rankings.module";

@Module({
  imports: [RankingsModule],
  controllers: [AdminAuditLogsController, AdminFightersController, AdminEventsController, AdminBoutsController]
})
export class AdminModule {}

