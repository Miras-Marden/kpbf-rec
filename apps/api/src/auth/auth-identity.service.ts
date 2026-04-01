import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { JwtPayload } from "./jwt-payload";
import type { AuthenticatedIdentity } from "./authenticated-identity";
import { SupabaseJwtVerifier } from "./supabase-jwt.verifier";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function extractBearerToken(authorizationHeader: string | undefined) {
  const raw = (authorizationHeader ?? "").trim();
  if (!raw) return "";
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

@Injectable()
export class AuthIdentityService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly supabaseJwt: SupabaseJwtVerifier
  ) {}

  private mapRoles(roles: Array<{ role: AuthenticatedIdentity["roles"][number] }>) {
    return roles.map((r) => r.role);
  }

  private async loadCanonicalUserIdentity(
    userId: string,
    authSource: AuthenticatedIdentity["authSource"],
    supabaseUserId: string | null = null
  ): Promise<AuthenticatedIdentity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      sub: user.id,
      email: normalizeEmail(user.email),
      roles: this.mapRoles(user.roles),
      authSource,
      supabaseUserId
    };
  }

  private async resolveFromLocalJwt(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity | null> {
    const token = extractBearerToken(authorizationHeader);
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!payload?.sub) return null;
      return this.loadCanonicalUserIdentity(payload.sub, "local-jwt", null);
    } catch {
      return null;
    }
  }

  private isSupabaseAutolinkEnabled() {
    return this.config.get<boolean>("AUTH_ENABLE_SUPABASE_AUTOLINK", { infer: true }) === true;
  }

  private isSupabaseEmailMatchLoginEnabled() {
    return (
      this.config.get<boolean>("AUTH_ALLOW_SUPABASE_EMAIL_MATCH_LOGIN", { infer: true }) === true
    );
  }

  private async resolveFromSupabaseJwt(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity | null> {
    if (!this.supabaseJwt.isEnabled()) return null;

    let claims;
    try {
      claims = await this.supabaseJwt.verifyAuthorizationHeader(authorizationHeader);
    } catch {
      return null;
    }
    if (!claims?.sub || !claims.email) return null;

    const supabaseUserId = claims.sub;
    const email = normalizeEmail(claims.email);

    const bySupabase = await this.prisma.user.findUnique({
      where: { supabaseUserId },
      select: { id: true }
    });
    if (bySupabase) {
      return this.loadCanonicalUserIdentity(bySupabase.id, "supabase", supabaseUserId);
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, supabaseUserId: true }
    });

    if (byEmail && this.isSupabaseAutolinkEnabled()) {
      if (!byEmail.supabaseUserId) {
        const existingBySupabase = await this.prisma.user.findUnique({
          where: { supabaseUserId },
          select: { id: true }
        });
        if (!existingBySupabase) {
          await this.prisma.user.update({
            where: { id: byEmail.id },
            data: { supabaseUserId }
          });
          await this.audit.log({
            userId: byEmail.id,
            action: "auth.supabase_autolink",
            entityType: "User",
            entityId: byEmail.id,
            note: `supabaseUserId=${supabaseUserId}`
          });
          return this.loadCanonicalUserIdentity(byEmail.id, "supabase", supabaseUserId);
        }
      }
    }

    if (byEmail && this.isSupabaseEmailMatchLoginEnabled()) {
      return this.loadCanonicalUserIdentity(byEmail.id, "supabase", null);
    }

    throw new UnauthorizedException("Supabase account is not linked");
  }

  async resolveOrThrow(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity> {
    const local = await this.resolveFromLocalJwt(authorizationHeader);
    if (local) return local;

    const supabase = await this.resolveFromSupabaseJwt(authorizationHeader);
    if (supabase) return supabase;

    throw new UnauthorizedException();
  }
}

