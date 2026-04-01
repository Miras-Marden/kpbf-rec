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

  private async resolveFromLocalJwt(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity | null> {
    const token = extractBearerToken(authorizationHeader);
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!payload?.sub || !payload.email || !Array.isArray(payload.roles)) return null;
      return {
        sub: payload.sub,
        email: normalizeEmail(payload.email),
        roles: payload.roles,
        authSource: "local-jwt",
        supabaseUserId: null
      };
    } catch {
      return null;
    }
  }

  private isSupabaseAutolinkEnabled() {
    return this.config.get<boolean>("AUTH_ENABLE_SUPABASE_AUTOLINK", { infer: true }) === true;
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
      include: { roles: true }
    });
    if (bySupabase) {
      return {
        sub: bySupabase.id,
        email: normalizeEmail(bySupabase.email),
        roles: bySupabase.roles.map((r) => r.role),
        authSource: "supabase",
        supabaseUserId
      };
    }

    // Migration bridge: optional safe auto-link by email.
    const byEmail = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true }
    });
    if (!byEmail) {
      throw new UnauthorizedException("User not provisioned");
    }

    if (this.isSupabaseAutolinkEnabled()) {
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
          return {
            sub: byEmail.id,
            email,
            roles: byEmail.roles.map((r) => r.role),
            authSource: "supabase",
            supabaseUserId
          };
        }
      }
    }

    // No auto-link: still allow login if email matches an existing user,
    // but we don't persist supabaseUserId without explicit link.
    return {
      sub: byEmail.id,
      email,
      roles: byEmail.roles.map((r) => r.role),
      authSource: "supabase",
      supabaseUserId: null
    };
  }

  async resolveOrThrow(authorizationHeader: string | undefined): Promise<AuthenticatedIdentity> {
    const local = await this.resolveFromLocalJwt(authorizationHeader);
    if (local) return local;

    const supabase = await this.resolveFromSupabaseJwt(authorizationHeader);
    if (supabase) return supabase;

    throw new UnauthorizedException();
  }
}

