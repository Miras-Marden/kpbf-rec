import { Controller, Get, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ModerationStatus } from "@prisma/client";

@Controller("public/fighters")
export class PublicFightersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("q") q?: string) {
    const items = await this.prisma.fighter.findMany({
      where: {
        moderationStatus: ModerationStatus.PUBLISHED,
        ...(q
          ? {
              fullName: {
                contains: q,
                mode: "insensitive"
              }
            }
          : {})
      },
      orderBy: { fullName: "asc" },
      take: 100,
      include: { weightCategory: true }
    });

    // Record aggregation is done from bouts (published only).
    const ids = items.map((x) => x.id);
    const bouts = await this.prisma.bout.findMany({
      where: {
        moderationStatus: ModerationStatus.PUBLISHED,
        OR: [{ fighterAId: { in: ids } }, { fighterBId: { in: ids } }]
      }
    });

    const recordById = new Map<
      string,
      { wins: number; losses: number; draws: number; nc: number }
    >();
    for (const id of ids) recordById.set(id, { wins: 0, losses: 0, draws: 0, nc: 0 });

    for (const b of bouts) {
      const a = recordById.get(b.fighterAId);
      const bRec = recordById.get(b.fighterBId);
      if (!a || !bRec) continue;

      // Result is from fighterA perspective (WIN/LOSS/DRAW/NC)
      if (b.result === "WIN") {
        a.wins += 1;
        bRec.losses += 1;
      } else if (b.result === "LOSS") {
        a.losses += 1;
        bRec.wins += 1;
      } else if (b.result === "DRAW") {
        a.draws += 1;
        bRec.draws += 1;
      } else {
        a.nc += 1;
        bRec.nc += 1;
      }
    }

    return {
      items: items.map((f) => ({
        id: f.id,
        slug: f.slug,
        fullName: f.fullName,
        photoUrl: f.photoUrl,
        nationality: f.nationality,
        regionCity: f.regionCity,
        weightCategory: f.weightCategory
          ? { slug: f.weightCategory.slug, name: f.weightCategory.name }
          : null,
        record: recordById.get(f.id) ?? { wins: 0, losses: 0, draws: 0, nc: 0 }
      }))
    };
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const fighter = await this.prisma.fighter.findFirst({
      where: { slug, moderationStatus: ModerationStatus.PUBLISHED },
      include: { weightCategory: true }
    });

    if (!fighter) return { fighter: null };

    // Overall record: computed from ALL published bouts.
    const allBouts = await this.prisma.bout.findMany({
      where: {
        moderationStatus: ModerationStatus.PUBLISHED,
        OR: [{ fighterAId: fighter.id }, { fighterBId: fighter.id }]
      },
      orderBy: { boutDate: "desc" }
    });

    // Recent fights list: limited separately.
    const recentBouts = allBouts.slice(0, 10);

    // Aggregate record from ALL published bouts
    const record = { wins: 0, losses: 0, draws: 0, nc: 0 };
    for (const b of allBouts) {
      const isA = b.fighterAId === fighter.id;
      const outcome = isA
        ? b.result
        : b.result === "WIN"
          ? "LOSS"
          : b.result === "LOSS"
            ? "WIN"
            : b.result;
      if (outcome === "WIN") record.wins += 1;
      else if (outcome === "LOSS") record.losses += 1;
      else if (outcome === "DRAW") record.draws += 1;
      else record.nc += 1;
    }

    const recentWithRelations = await this.prisma.bout.findMany({
      where: { id: { in: recentBouts.map((b) => b.id) } },
      orderBy: { boutDate: "desc" },
      include: {
        fighterA: true,
        fighterB: true,
        event: true
      }
    });

    const lastFights = recentWithRelations.map((b) => {
      const isA = b.fighterAId === fighter.id;
      const opponent = isA ? b.fighterB : b.fighterA;
      const outcome = isA
        ? b.result
        : b.result === "WIN"
          ? "LOSS"
          : b.result === "LOSS"
            ? "WIN"
            : b.result;
      return {
        id: b.id,
        date: b.boutDate.toISOString(),
        opponentName: opponent.fullName,
        result: outcome,
        method: b.method,
        event: b.event ? { name: b.event.name } : null
      };
    });

    return {
      fighter: {
        id: fighter.id,
        slug: fighter.slug,
        fullName: fighter.fullName,
        photoUrl: fighter.photoUrl,
        dateOfBirth: fighter.dateOfBirth?.toISOString() ?? null,
        nationality: fighter.nationality,
        regionCity: fighter.regionCity,
        heightCm: fighter.heightCm,
        reachCm: fighter.reachCm,
        stance: fighter.stance,
        weightCategory: fighter.weightCategory
          ? { slug: fighter.weightCategory.slug, name: fighter.weightCategory.name }
          : null,
        record,
        lastFights
      }
    };
  }
}

