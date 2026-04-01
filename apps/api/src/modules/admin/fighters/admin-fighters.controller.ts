import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { Roles } from "../../../rbac/roles.decorator";
import { AuditService } from "../../../audit/audit.service";
import { ModerationStatus, Role } from "@prisma/client";
import { AdminCreateFighterDto } from "./dto/admin-create-fighter.dto";
import { AdminUpdateFighterDto } from "./dto/admin-update-fighter.dto";
import { CurrentUser } from "../../../auth/current-user.decorator";
import { AnyAuthGuard } from "../../../auth/any-auth.guard";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@UseGuards(AnyAuthGuard)
@Controller("admin/fighters")
export class AdminFightersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  async list() {
    const items = await this.prisma.fighter.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { weightCategory: true }
    });
    return { items };
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: AdminCreateFighterDto
  ) {
    const slugBase = slugify(dto.fullName);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

    const fighter = await this.prisma.fighter.create({
      data: {
        slug,
        fullName: dto.fullName,
        photoUrl: dto.photoUrl ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        nationality: dto.nationality ?? "Kazakhstan",
        regionCity: dto.regionCity ?? null,
        weightCategoryId: dto.weightCategoryId ?? null,
        moderationStatus: ModerationStatus.DRAFT,
        createdByUserId: user.sub,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "fighter.create",
      entityType: "Fighter",
      entityId: fighter.id
    });

    return { fighter };
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.EDITOR)
  async update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: AdminUpdateFighterDto
  ) {
    const fighter = await this.prisma.fighter.update({
      where: { id },
      data: {
        fullName: dto.fullName ?? undefined,
        photoUrl: dto.photoUrl === undefined ? undefined : dto.photoUrl,
        dateOfBirth: dto.dateOfBirth === undefined ? undefined : dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        nationality: dto.nationality === undefined ? undefined : dto.nationality,
        regionCity: dto.regionCity === undefined ? undefined : dto.regionCity,
        weightCategoryId: dto.weightCategoryId === undefined ? undefined : dto.weightCategoryId,
        moderationNote: dto.moderationNote === undefined ? undefined : dto.moderationNote,
        updatedByUserId: user.sub
      }
    });

    await this.audit.log({
      userId: user.sub,
      action: "fighter.update",
      entityType: "Fighter",
      entityId: fighter.id
    });

    return { fighter };
  }

  @Post(":id/submit")
  @Roles(Role.ADMIN, Role.EDITOR)
  async submit(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const fighter = await this.prisma.fighter.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.PENDING,
        updatedByUserId: user.sub
      }
    });
    await this.audit.log({
      userId: user.sub,
      action: "fighter.submit",
      entityType: "Fighter",
      entityId: fighter.id
    });
    return { fighter };
  }

  @Post(":id/publish")
  @Roles(Role.ADMIN)
  async publish(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const fighter = await this.prisma.fighter.update({
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
      action: "fighter.publish",
      entityType: "Fighter",
      entityId: fighter.id
    });
    return { fighter };
  }

  @Post(":id/reject")
  @Roles(Role.ADMIN)
  async reject(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const fighter = await this.prisma.fighter.update({
      where: { id },
      data: {
        moderationStatus: ModerationStatus.REJECTED,
        approvedByUserId: user.sub,
        updatedByUserId: user.sub
      }
    });
    await this.audit.log({
      userId: user.sub,
      action: "fighter.reject",
      entityType: "Fighter",
      entityId: fighter.id
    });
    return { fighter };
  }
}

