import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ModerationStatus, Role } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuditService } from "../../../audit/audit.service";
import { Roles } from "../../../rbac/roles.decorator";
import { CurrentUser } from "../../../auth/current-user.decorator";
import { AdminCreateEventDto } from "./dto/admin-create-event.dto";
import { AdminUpdateEventDto } from "./dto/admin-update-event.dto";
import { AnyAuthGuard } from "../../../auth/any-auth.guard";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@UseGuards(AnyAuthGuard)
@Controller("admin/events")
export class AdminEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  async list() {
    const items = await this.prisma.event.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    return { items };
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  async create(@CurrentUser() user: { sub: string }, @Body() dto: AdminCreateEventDto) {
    const slugBase = slugify(dto.name);
    if (!slugBase) throw new BadRequestException("Invalid event name");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

    const event = await this.prisma.event.create({
      data: {
        slug,
        name: dto.name,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        city: dto.city ?? null,
        country: dto.country ?? null,
        moderationStatus: ModerationStatus.DRAFT,
        createdByUserId: user.sub,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "event.create",
      entityType: "Event",
      entityId: event.id
    });

    return { event };
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.EDITOR)
  async update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: AdminUpdateEventDto
  ) {
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        eventDate: dto.eventDate === undefined ? undefined : dto.eventDate ? new Date(dto.eventDate) : null,
        city: dto.city === undefined ? undefined : dto.city,
        country: dto.country === undefined ? undefined : dto.country,
        moderationNote: dto.moderationNote === undefined ? undefined : dto.moderationNote,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "event.update",
      entityType: "Event",
      entityId: event.id
    });

    return { event };
  }

  @Post(":id/submit")
  @Roles(Role.ADMIN, Role.EDITOR)
  async submit(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.PENDING,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "event.submit",
      entityType: "Event",
      entityId: event.id
    });

    return { event };
  }

  @Post(":id/publish")
  @Roles(Role.ADMIN)
  async publish(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const event = await this.prisma.event.update({
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
      action: "event.publish",
      entityType: "Event",
      entityId: event.id
    });

    return { event };
  }

  @Post(":id/reject")
  @Roles(Role.ADMIN)
  async reject(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.REJECTED,
        approvedByUserId: user.sub,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "event.reject",
      entityType: "Event",
      entityId: event.id
    });

    return { event };
  }
}

