import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ModerationStatus } from "@prisma/client";

@Controller("public/events")
export class PublicEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.event.findMany({
      where: { moderationStatus: ModerationStatus.PUBLISHED },
      orderBy: [{ eventDate: "desc" }, { updatedAt: "desc" }],
      take: 100
    });

    return {
      items: items.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        eventDate: e.eventDate?.toISOString() ?? null,
        city: e.city,
        country: e.country
      }))
    };
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const event = await this.prisma.event.findFirst({
      where: { slug, moderationStatus: ModerationStatus.PUBLISHED }
    });
    if (!event) return { event: null };

    const fights = await this.prisma.bout.findMany({
      where: { eventId: event.id, moderationStatus: ModerationStatus.PUBLISHED },
      orderBy: { boutDate: "asc" },
      include: { fighterA: true, fighterB: true, weightCategory: true }
    });

    return {
      event: {
        id: event.id,
        slug: event.slug,
        name: event.name,
        eventDate: event.eventDate?.toISOString() ?? null,
        city: event.city,
        country: event.country,
        fights: fights.map((b) => ({
          id: b.id,
          date: b.boutDate.toISOString(),
          fighterA: { id: b.fighterA.id, slug: b.fighterA.slug, fullName: b.fighterA.fullName },
          fighterB: { id: b.fighterB.id, slug: b.fighterB.slug, fullName: b.fighterB.fullName },
          weightCategory: b.weightCategory ? { slug: b.weightCategory.slug, name: b.weightCategory.name } : null,
          result: b.result,
          method: b.method
        }))
      }
    };
  }
}

