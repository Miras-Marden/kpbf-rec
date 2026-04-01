import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "../../../rbac/roles.decorator";
import { Role } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { AnyAuthGuard } from "../../../auth/any-auth.guard";

@UseGuards(AnyAuthGuard)
@Controller("admin/audit-logs")
export class AdminAuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.ADMIN)
  async list() {
    const items = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return {
      items: items.map((x) => ({
        id: x.id,
        createdAt: x.createdAt.toISOString(),
        action: x.action,
        entityType: x.entityType,
        entityId: x.entityId,
        note: x.note
      }))
    };
  }
}

