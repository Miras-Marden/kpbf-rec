import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RbacModule } from "./rbac/rbac.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PublicModule } from "./modules/public/public.module";
import { AuditModule } from "./audit/audit.module";
import { RankingsModule } from "./modules/rankings/rankings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    RbacModule,
    RankingsModule,
    AdminModule,
    PublicModule,
    HealthModule,
  ],
})
export class AppModule {}

