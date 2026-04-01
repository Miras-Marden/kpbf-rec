import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseJwtVerifier } from "./supabase-jwt.verifier";
import type { JwtPayload } from "./jwt-payload";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class AnyAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {
  }

  private async verifyCurrentJwt(authorization: string | undefined): Promise<JwtPayload | null> {
    const raw = (authorization ?? "").trim();
    if (!raw.toLowerCase().startsWith("bearer ")) return null;
    const token = raw.slice(7).trim();
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!payload?.sub || !payload.email) return null;
      return payload;
    } catch {
      return null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authorization = (req.headers?.authorization as string | undefined) ?? undefined;

    // 1) Current JWT flow (existing)
    const current = await this.verifyCurrentJwt(authorization);
    if (current) {
      req.user = current;
      return true;
    }

    // 2) Supabase bridge (optional, enabled only when env is configured)
    // We resolve roles from Prisma to keep RBAC consistent with existing domain model.
    const supabase = new SupabaseJwtVerifier(this.config);
    if (supabase.isEnabled()) {
      try {
        const claims = await supabase.verifyAuthorizationHeader(authorization);
        if (claims?.sub && claims.email) {
          // Prefer explicit linking via User.supabaseUserId. As a migration bridge:
          // - if not linked, we can auto-link when email matches a single existing user.
          const bySupabase = await this.prisma.user.findUnique({
            where: { supabaseUserId: claims.sub },
            include: { roles: true }
          });

          let user = bySupabase;

          if (!user) {
            const email = claims.email.trim().toLowerCase();
            user = await this.prisma.user.findUnique({
              where: { email },
              include: { roles: true }
            });

            if (user && !user.supabaseUserId) {
              // Safe auto-link: only when the Prisma account exists and is not already linked.
              await this.prisma.user.update({
                where: { id: user.id },
                data: { supabaseUserId: claims.sub }
              });
              await this.audit.log({
                userId: user.id,
                action: "auth.supabase_autolink",
                entityType: "User",
                entityId: user.id,
                note: `supabaseUserId=${claims.sub}`
              });
              user = { ...user, supabaseUserId: claims.sub };
            }
          }

          if (!user) throw new UnauthorizedException("User not provisioned");

          req.user = {
            sub: user.id,
            email: user.email,
            roles: user.roles.map((r) => r.role)
          } satisfies JwtPayload;
          return true;
        }
      } catch {
        // fallthrough to unauthorized
      }
    }

    throw new UnauthorizedException();
  }
}

