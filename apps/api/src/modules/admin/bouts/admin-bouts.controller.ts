import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ModerationStatus, Role } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuditService } from "../../../audit/audit.service";
import { Roles } from "../../../rbac/roles.decorator";
import { CurrentUser } from "../../../auth/current-user.decorator";
import { AdminCreateBoutDto } from "./dto/admin-create-bout.dto";
import { AdminUpdateBoutDto } from "./dto/admin-update-bout.dto";
import { RankingsOrchestratorService } from "../../rankings/rankings-orchestrator.service";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@UseGuards(AuthGuard("jwt"))
@Controller("admin/bouts")
export class AdminBoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rankingsOrchestrator: RankingsOrchestratorService
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  async list() {
    const items = await this.prisma.bout.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { fighterA: true, fighterB: true, event: true, weightCategory: true }
    });
    return { items };
  }

  private async validateParticipants(params: {
    fighterAId: string;
    fighterBId: string;
    eventId?: string | null;
    weightCategoryId?: string | null;
  }) {
    if (params.fighterAId === params.fighterBId) {
      throw new BadRequestException("fighterAId and fighterBId must be different");
    }

    const fighters = await this.prisma.fighter.findMany({
      where: { id: { in: [params.fighterAId, params.fighterBId] } },
      select: { id: true, fullName: true }
    });
    if (fighters.length !== 2) throw new BadRequestException("Invalid fighter IDs");

    if (params.eventId) {
      const ev = await this.prisma.event.findUnique({ where: { id: params.eventId }, select: { id: true } });
      if (!ev) throw new BadRequestException("Invalid eventId");
    }

    if (params.weightCategoryId) {
      const wc = await this.prisma.weightCategory.findUnique({
        where: { id: params.weightCategoryId },
        select: { id: true }
      });
      if (!wc) throw new BadRequestException("Invalid weightCategoryId");
    }
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  async create(@CurrentUser() user: { sub: string }, @Body() dto: AdminCreateBoutDto) {
    await this.validateParticipants({
      fighterAId: dto.fighterAId,
      fighterBId: dto.fighterBId,
      eventId: dto.eventId ?? null,
      weightCategoryId: dto.weightCategoryId ?? null
    });

    const fA = await this.prisma.fighter.findUnique({ where: { id: dto.fighterAId }, select: { fullName: true } });
    const fB = await this.prisma.fighter.findUnique({ where: { id: dto.fighterBId }, select: { fullName: true } });
    const base = slugify(`${fA?.fullName ?? "a"}-vs-${fB?.fullName ?? "b"}-${dto.boutDate.slice(0, 10)}`);
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

    const bout = await this.prisma.bout.create({
      data: {
        slug,
        boutDate: new Date(dto.boutDate),
        fighterAId: dto.fighterAId,
        fighterBId: dto.fighterBId,
        weightCategoryId: dto.weightCategoryId ?? null,
        eventId: dto.eventId ?? null,
        result: dto.result,
        method: dto.method,
        venue: dto.venue ?? null,
        city: dto.city ?? null,
        country: dto.country ?? null,
        referee: dto.referee ?? null,
        moderationStatus: ModerationStatus.DRAFT,
        createdByUserId: user.sub,
        updatedByUserId: user.sub
      },
      include: { fighterA: true, fighterB: true, event: true, weightCategory: true }
    });

    await this.audit.log({
      userId: user.sub,
      action: "bout.create",
      entityType: "Bout",
      entityId: bout.id
    });

    return { bout };
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.EDITOR)
  async update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: AdminUpdateBoutDto
  ) {
    const current = await this.prisma.bout.findUnique({
      where: { id },
      select: { fighterAId: true, fighterBId: true, eventId: true, weightCategoryId: true }
    });
    if (!current) throw new BadRequestException("Bout not found");

    const next = {
      fighterAId: dto.fighterAId ?? current.fighterAId,
      fighterBId: dto.fighterBId ?? current.fighterBId,
      eventId: dto.eventId === undefined ? current.eventId : dto.eventId,
      weightCategoryId: dto.weightCategoryId === undefined ? current.weightCategoryId : dto.weightCategoryId
    };
    await this.validateParticipants(next);

    const bout = await this.prisma.bout.update({
      where: { id },
      data: {
        fighterAId: dto.fighterAId ?? undefined,
        fighterBId: dto.fighterBId ?? undefined,
        boutDate: dto.boutDate === undefined ? undefined : new Date(dto.boutDate),
        weightCategoryId: dto.weightCategoryId === undefined ? undefined : dto.weightCategoryId,
        eventId: dto.eventId === undefined ? undefined : dto.eventId,
        result: dto.result ?? undefined,
        method: dto.method ?? undefined,
        venue: dto.venue === undefined ? undefined : dto.venue,
        city: dto.city === undefined ? undefined : dto.city,
        country: dto.country === undefined ? undefined : dto.country,
        referee: dto.referee === undefined ? undefined : dto.referee,
        moderationNote: dto.moderationNote === undefined ? undefined : dto.moderationNote,
        updatedByUserId: user.sub
      },
      include: { fighterA: true, fighterB: true, event: true, weightCategory: true }
    });

    await this.audit.log({
      userId: user.sub,
      action: "bout.update",
      entityType: "Bout",
      entityId: bout.id
    });

    return { bout };
  }

  @Post(":id/submit")
  @Roles(Role.ADMIN, Role.EDITOR)
  async submit(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const bout = await this.prisma.bout.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.PENDING,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "bout.submit",
      entityType: "Bout",
      entityId: bout.id
    });

    return { bout };
  }

  @Post(":id/publish")
  @Roles(Role.ADMIN)
  async publish(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const bout = await this.prisma.bout.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.PUBLISHED,
        approvedByUserId: user.sub,
        publishedAt: new Date(),
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "bout.publish",
      entityType: "Bout",
      entityId: bout.id
    });

    const rankingRecalculation = await this.rankingsOrchestrator.triggerRecalculation({
      source: "bout.publish",
      boutId: bout.id
    });

    return { bout, rankingRecalculation };
  }

  @Post(":id/reject")
  @Roles(Role.ADMIN)
  async reject(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const bout = await this.prisma.bout.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.REJECTED,
        approvedByUserId: user.sub,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "bout.reject",
      entityType: "Bout",
      entityId: bout.id
    });

    return { bout };
  }
}

