import { Controller, Get, Param, Query } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ModerationStatus } from "@prisma/client";

@Controller("public/fights")
export class PublicFightsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("take") takeRaw?: string) {
    const take = Math.max(1, Math.min(200, Number(takeRaw ?? 50) || 50));
    const items = await this.prisma.bout.findMany({
      where: { moderationStatus: ModerationStatus.PUBLISHED },
      orderBy: { boutDate: "desc" },
      take
    });

    const fighterIds = Array.from(new Set(items.flatMap((b) => [b.fighterAId, b.fighterBId])));
    const eventIds = Array.from(new Set(items.map((b) => b.eventId).filter((x): x is string => !!x)));
    const weightIds = Array.from(
      new Set(items.map((b) => b.weightCategoryId).filter((x): x is string => !!x))
    );

    const [fighters, events, weights] = await Promise.all([
      this.prisma.fighter.findMany({ where: { id: { in: fighterIds } } }),
      this.prisma.event.findMany({ where: { id: { in: eventIds } } }),
      this.prisma.weightCategory.findMany({ where: { id: { in: weightIds } } })
    ]);

    const fighterById = new Map(fighters.map((f) => [f.id, f]));
    const eventById = new Map(events.map((e) => [e.id, e]));
    const weightById = new Map(weights.map((w) => [w.id, w]));

    return {
      items: items.map((b) => ({
        id: b.id,
        slug: b.slug,
        date: b.boutDate.toISOString(),
        fighterA: (() => {
          const f = fighterById.get(b.fighterAId);
          return f ? { id: f.id, slug: f.slug, fullName: f.fullName } : null;
        })(),
        fighterB: (() => {
          const f = fighterById.get(b.fighterBId);
          return f ? { id: f.id, slug: f.slug, fullName: f.fullName } : null;
        })(),
        event: b.eventId
          ? (() => {
              const e = eventById.get(b.eventId!);
              return e ? { id: e.id, slug: e.slug, name: e.name } : null;
            })()
          : null,
        weightCategory: b.weightCategoryId
          ? (() => {
              const w = weightById.get(b.weightCategoryId!);
              return w ? { slug: w.slug, name: w.name } : null;
            })()
          : null,
        result: b.result,
        method: b.method
      }))
    };
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const b = await this.prisma.bout.findFirst({
      where: { id, moderationStatus: ModerationStatus.PUBLISHED }
    });
    if (!b) return { fight: null };

    const [fighterA, fighterB, event, weightCategory] = await Promise.all([
      this.prisma.fighter.findUnique({ where: { id: b.fighterAId } }),
      this.prisma.fighter.findUnique({ where: { id: b.fighterBId } }),
      b.eventId ? this.prisma.event.findUnique({ where: { id: b.eventId } }) : Promise.resolve(null),
      b.weightCategoryId
        ? this.prisma.weightCategory.findUnique({ where: { id: b.weightCategoryId } })
        : Promise.resolve(null),
    ]);

    return {
      fight: {
        id: b.id,
        slug: b.slug,
        date: b.boutDate.toISOString(),
        fighterA: fighterA ? { id: fighterA.id, slug: fighterA.slug, fullName: fighterA.fullName } : null,
        fighterB: fighterB ? { id: fighterB.id, slug: fighterB.slug, fullName: fighterB.fullName } : null,
        event: event ? { id: event.id, slug: event.slug, name: event.name } : null,
        weightCategory: weightCategory ? { slug: weightCategory.slug, name: weightCategory.name } : null,
        venue: b.venue,
        city: b.city,
        country: b.country,
        referee: b.referee,
        result: b.result,
        method: b.method,
        judgesScores: []
      }
    };
  }
}

