import { Module } from "@nestjs/common";
import { PublicFightersController } from "./fighters/public-fighters.controller";
import { PublicSearchController } from "./search/public-search.controller";
import { PublicEventsController } from "./events/public-events.controller";
import { PublicFightsController } from "./fights/public-fights.controller";

@Module({
  controllers: [PublicFightersController, PublicSearchController, PublicEventsController, PublicFightsController]
})
export class PublicModule {}

