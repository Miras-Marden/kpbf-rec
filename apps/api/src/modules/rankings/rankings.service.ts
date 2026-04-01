import { Injectable } from "@nestjs/common";
import {
  FightOutcome,
  ModerationStatus,
  Prisma,
  RankingScope,
  RankingStyle
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BASE_K_FACTOR,
  BASE_RATING,
  METHOD_MULTIPLIERS,
  RANKING_METHODOLOGY_VERSION,
  computeInactivityPenalty,
  expectedScore,
  getImportanceMultiplier,
  getMethodologyMetadata
} from "./ranking-methodology";

type FighterStats = {
  wins: number;
  losses: number;
  draws: number;
  nc: number;
  totalBouts: number;
  lastBoutAt: Date | null;
};

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  private emptyStats(): FighterStats {
    return { wins: 0, losses: 0, draws: 0, nc: 0, totalBouts: 0, lastBoutAt: null };
  }

  private resolveOutcomeScores(result: FightOutcome) {
    if (result === "WIN") return { a: 1, b: 0 };
    if (result === "LOSS") return { a: 0, b: 1 };
    if (result === "DRAW") return { a: 0.5, b: 0.5 };
    return null;
  }

  async recalculateAll(trigger: { source: string; boutId?: string }) {
    const [fighters, categories, publishedBouts] = await Promise.all([
      this.prisma.fighter.findMany({
        select: { id: true, weightCategoryId: true }
      }),
      this.prisma.weightCategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, slug: true, name: true }
      }),
      this.prisma.bout.findMany({
        where: { moderationStatus: ModerationStatus.PUBLISHED },
        orderBy: [{ boutDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          boutDate: true,
          fighterAId: true,
          fighterBId: true,
          result: true,
          method: true,
          eventId: true
        }
      })
    ]);

    const rating = new Map<string, number>();
    const stats = new Map<string, FighterStats>();

    for (const f of fighters) {
      rating.set(f.id, BASE_RATING);
      stats.set(f.id, this.emptyStats());
    }

    for (const bout of publishedBouts) {
      const outcome = this.resolveOutcomeScores(bout.result);
      const fighterAStats = stats.get(bout.fighterAId) ?? this.emptyStats();
      const fighterBStats = stats.get(bout.fighterBId) ?? this.emptyStats();

      fighterAStats.totalBouts += 1;
      fighterBStats.totalBouts += 1;
      fighterAStats.lastBoutAt = bout.boutDate;
      fighterBStats.lastBoutAt = bout.boutDate;

      if (bout.result === "WIN") {
        fighterAStats.wins += 1;
        fighterBStats.losses += 1;
      } else if (bout.result === "LOSS") {
        fighterAStats.losses += 1;
        fighterBStats.wins += 1;
      } else if (bout.result === "DRAW") {
        fighterAStats.draws += 1;
        fighterBStats.draws += 1;
      } else {
        fighterAStats.nc += 1;
        fighterBStats.nc += 1;
      }

      stats.set(bout.fighterAId, fighterAStats);
      stats.set(bout.fighterBId, fighterBStats);

      if (!outcome) continue;

      const ratingA = rating.get(bout.fighterAId) ?? BASE_RATING;
      const ratingB = rating.get(bout.fighterBId) ?? BASE_RATING;
      const expectedA = expectedScore(ratingA, ratingB);
      const expectedB = expectedScore(ratingB, ratingA);

      const importanceMultiplier = getImportanceMultiplier(Boolean(bout.eventId));
      const methodMultiplier = METHOD_MULTIPLIERS[bout.method] ?? 1;
      const k = BASE_K_FACTOR * importanceMultiplier * methodMultiplier;
      const deltaA = k * (outcome.a - expectedA);
      const deltaB = k * (outcome.b - expectedB);

      rating.set(bout.fighterAId, ratingA + deltaA);
      rating.set(bout.fighterBId, ratingB + deltaB);
    }

    const now = new Date();
    const fighterById = new Map(fighters.map((f) => [f.id, f]));
    const currentRows: Prisma.RankingCurrentCreateManyInput[] = [];
    const snapshotRows: Prisma.RankingSnapshotCreateManyInput[] = [];

    const addRows = (params: {
      scope: RankingScope;
      style: RankingStyle;
      weightCategoryId: string | null;
      fighterIds: string[];
    }) => {
      const scored = params.fighterIds
        .map((fighterId) => {
          const base = rating.get(fighterId);
          if (base === undefined) return null;
          const s = stats.get(fighterId) ?? this.emptyStats();
          const daysSinceLastBout = s.lastBoutAt
            ? Math.floor((now.getTime() - s.lastBoutAt.getTime()) / 86_400_000)
            : null;
          const inactivityPenalty =
            params.style === RankingStyle.ACTIVE ? computeInactivityPenalty(daysSinceLastBout) : 0;
          const finalRating = base - inactivityPenalty;
          return { fighterId, stats: s, finalRating, base, daysSinceLastBout, inactivityPenalty };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .filter((x) => x.stats.totalBouts > 0)
        .sort((a, b) => b.finalRating - a.finalRating);

      scored.forEach((row, idx) => {
        const rank = idx + 1;
        const explanation: Prisma.InputJsonValue = {
          trigger,
          style: params.style,
          scope: params.scope,
          baseRating: Number(row.base.toFixed(3)),
          inactivityPenalty: Number(row.inactivityPenalty.toFixed(3)),
          finalRating: Number(row.finalRating.toFixed(3)),
          daysSinceLastBout: row.daysSinceLastBout,
          record: {
            wins: row.stats.wins,
            losses: row.stats.losses,
            draws: row.stats.draws,
            nc: row.stats.nc
          },
          totalBouts: row.stats.totalBouts,
          lastBoutAt: row.stats.lastBoutAt?.toISOString() ?? null
        };

        currentRows.push({
          scope: params.scope,
          style: params.style,
          fighterId: row.fighterId,
          weightCategoryId: params.weightCategoryId,
          rating: Number(row.finalRating.toFixed(3)),
          rank,
          methodologyVersion: RANKING_METHODOLOGY_VERSION,
          computedAt: now,
          explanationJson: explanation
        });

        snapshotRows.push({
          snapshotAt: now,
          scope: params.scope,
          style: params.style,
          fighterId: row.fighterId,
          weightCategoryId: params.weightCategoryId,
          rating: Number(row.finalRating.toFixed(3)),
          rank,
          methodologyVersion: RANKING_METHODOLOGY_VERSION,
          explanationJson: explanation
        });
      });
    };

    const allRatedFighterIds = Array.from(rating.keys());
    addRows({
      scope: RankingScope.P4P,
      style: RankingStyle.ALL_TIME,
      weightCategoryId: null,
      fighterIds: allRatedFighterIds
    });
    addRows({
      scope: RankingScope.P4P,
      style: RankingStyle.ACTIVE,
      weightCategoryId: null,
      fighterIds: allRatedFighterIds
    });

    for (const category of categories) {
      const fighterIdsInCategory = fighters
        .filter((f) => f.weightCategoryId === category.id)
        .map((f) => f.id);

      addRows({
        scope: RankingScope.WEIGHT_CATEGORY,
        style: RankingStyle.ALL_TIME,
        weightCategoryId: category.id,
        fighterIds: fighterIdsInCategory
      });
      addRows({
        scope: RankingScope.WEIGHT_CATEGORY,
        style: RankingStyle.ACTIVE,
        weightCategoryId: category.id,
        fighterIds: fighterIdsInCategory
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rankingCurrent.deleteMany({});
      if (currentRows.length > 0) {
        await tx.rankingCurrent.createMany({ data: currentRows });
      }
      if (snapshotRows.length > 0) {
        await tx.rankingSnapshot.createMany({ data: snapshotRows });
      }
    });

    return {
      ok: true,
      computedAt: now.toISOString(),
      methodology: getMethodologyMetadata(),
      totalRowsCurrent: currentRows.length,
      totalRowsSnapshotsAdded: snapshotRows.length
    };
  }

  async getCategories() {
    const items = await this.prisma.weightCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true }
    });
    return { items };
  }

  async getCurrentByWeightCategory(categorySlug: string, view: RankingStyle) {
    const category = await this.prisma.weightCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true, slug: true, name: true }
    });
    if (!category) {
      return { category: null, items: [], methodology: getMethodologyMetadata() };
    }

    const rows = await this.prisma.rankingCurrent.findMany({
      where: {
        scope: RankingScope.WEIGHT_CATEGORY,
        style: view,
        weightCategoryId: category.id
      },
      orderBy: { rank: "asc" },
      include: {
        fighter: { select: { id: true, slug: true, fullName: true, photoUrl: true } }
      }
    });

    return {
      category,
      view,
      methodology: getMethodologyMetadata(),
      items: rows.map((r) => ({
        fighter: r.fighter,
        rank: r.rank,
        rating: r.rating,
        explanation: r.explanationJson ?? null,
        computedAt: r.computedAt.toISOString()
      }))
    };
  }

  async getCurrentP4P(view: RankingStyle) {
    const rows = await this.prisma.rankingCurrent.findMany({
      where: { scope: RankingScope.P4P, style: view, weightCategoryId: null },
      orderBy: { rank: "asc" },
      include: {
        fighter: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            photoUrl: true,
            weightCategory: { select: { slug: true, name: true } }
          }
        }
      }
    });

    return {
      view,
      methodology: getMethodologyMetadata(),
      items: rows.map((r) => ({
        fighter: r.fighter,
        rank: r.rank,
        rating: r.rating,
        explanation: r.explanationJson ?? null,
        computedAt: r.computedAt.toISOString()
      }))
    };
  }

  async getHistory(params: {
    scope: RankingScope;
    view: RankingStyle;
    categorySlug?: string;
  }) {
    let categoryId: string | undefined;
    let category: { slug: string; name: string } | null = null;

    if (params.scope === RankingScope.WEIGHT_CATEGORY) {
      if (!params.categorySlug) {
        return { snapshots: [], category: null, methodology: getMethodologyMetadata() };
      }
      const found = await this.prisma.weightCategory.findUnique({
        where: { slug: params.categorySlug },
        select: { id: true, slug: true, name: true }
      });
      if (!found) {
        return { snapshots: [], category: null, methodology: getMethodologyMetadata() };
      }
      categoryId = found.id;
      category = { slug: found.slug, name: found.name };
    }

    const rows = await this.prisma.rankingSnapshot.findMany({
      where: {
        scope: params.scope,
        style: params.view,
        weightCategoryId: categoryId ?? null
      },
      orderBy: [{ snapshotAt: "desc" }, { rank: "asc" }],
      include: {
        fighter: { select: { id: true, slug: true, fullName: true, photoUrl: true } }
      },
      take: 2000
    });

    const grouped = new Map<string, Array<(typeof rows)[number]>>();
    for (const row of rows) {
      const key = row.snapshotAt.toISOString();
      const current = grouped.get(key) ?? [];
      current.push(row);
      grouped.set(key, current);
    }

    return {
      scope: params.scope,
      view: params.view,
      category,
      methodology: getMethodologyMetadata(),
      snapshots: Array.from(grouped.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([snapshotAt, items]) => ({
          snapshotAt,
          items: items
            .sort((a, b) => a.rank - b.rank)
            .map((r) => ({
              fighter: r.fighter,
              rank: r.rank,
              rating: r.rating,
              explanation: r.explanationJson ?? null
            }))
        }))
    };
  }
}
