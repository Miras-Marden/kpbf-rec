import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import { RankingScope, RankingStyle } from "@prisma/client";
import { RankingsService } from "./rankings.service";

function parseView(view?: string): RankingStyle {
  if (!view || view === "active") return RankingStyle.ACTIVE;
  if (view === "all_time") return RankingStyle.ALL_TIME;
  throw new BadRequestException("view must be active|all_time");
}

@Controller("public/rankings")
export class PublicRankingsController {
  constructor(private readonly rankings: RankingsService) {}

  @Get("categories")
  async categories() {
    return this.rankings.getCategories();
  }

  @Get("weight/:categorySlug")
  async byWeight(@Param("categorySlug") categorySlug: string, @Query("view") view?: string) {
    return this.rankings.getCurrentByWeightCategory(categorySlug, parseView(view));
  }

  @Get("p4p")
  async p4p(@Query("view") view?: string) {
    return this.rankings.getCurrentP4P(parseView(view));
  }

  @Get("history")
  async history(
    @Query("scope") scope?: string,
    @Query("view") view?: string,
    @Query("category") category?: string
  ) {
    if (!scope || !["weight", "p4p"].includes(scope)) {
      throw new BadRequestException("scope must be weight|p4p");
    }
    const parsedScope = scope === "weight" ? RankingScope.WEIGHT_CATEGORY : RankingScope.P4P;
    return this.rankings.getHistory({
      scope: parsedScope,
      view: parseView(view),
      categorySlug: category
    });
  }
}
