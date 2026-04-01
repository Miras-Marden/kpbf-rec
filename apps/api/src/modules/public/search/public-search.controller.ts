import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ModerationStatus } from "@prisma/client";

@Controller("public/search")
export class PublicSearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@Query("q") q?: string) {
    const query = (q ?? "").trim();
    if (!query) return { items: [] };

    const fighters = await this.prisma.fighter.findMany({
      where: {
        moderationStatus: ModerationStatus.PUBLISHED,
        fullName: { contains: query, mode: "insensitive" }
      },
      take: 10,
      orderBy: { fullName: "asc" }
    });

    const events = await this.prisma.event.findMany({
      where: {
        moderationStatus: ModerationStatus.PUBLISHED,
        name: { contains: query, mode: "insensitive" }
      },
      take: 5,
      orderBy: { name: "asc" }
    });

    const news = await this.prisma.news.findMany({
      where: {
        moderationStatus: ModerationStatus.PUBLISHED,
        title: { contains: query, mode: "insensitive" }
      },
      take: 5,
      orderBy: { createdAt: "desc" }
    });

    return {
      items: [
        ...fighters.map((f) => ({
          type: "fighter" as const,
          id: f.id,
          slug: f.slug,
          title: f.fullName
        })),
        ...events.map((e) => ({
          type: "event" as const,
          id: e.id,
          slug: e.slug,
          title: e.name
        })),
        ...news.map((n) => ({
          type: "news" as const,
          id: n.id,
          slug: n.slug,
          title: n.title
        }))
      ]
    };
  }
}

