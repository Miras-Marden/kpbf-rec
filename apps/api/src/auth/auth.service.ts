import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import { Role } from "@prisma/client";
import type { JwtPayload } from "./jwt-payload";
import type { SupabaseJwtClaims } from "./supabase-jwt.verifier";
import type { AuthenticatedIdentity } from "./authenticated-identity";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  private getAccessTtlSeconds() {
    return this.config.get<number>("JWT_ACCESS_TTL_SECONDS", { infer: true });
  }

  private getRefreshTtlSeconds() {
    return this.config.get<number>("JWT_REFRESH_TTL_SECONDS", { infer: true });
  }

  private computeRefreshCookieName() {
    return this.config.get<string>("JWT_REFRESH_COOKIE_NAME", { infer: true }) ?? "refreshToken";
  }

  getRefreshCookieName() {
    return this.computeRefreshCookieName();
  }

  isCookieSecure() {
    const nodeEnv = this.config.get<string>("NODE_ENV", { infer: true }) ?? "development";
    return nodeEnv === "production";
  }

  getCookieSameSite(): "lax" | "strict" | "none" {
    const raw = (this.config.get<string>("AUTH_COOKIE_SAMESITE", { infer: true }) ?? "lax").toLowerCase();
    if (raw === "none") return "none";
    if (raw === "strict") return "strict";
    return "lax";
  }

  getCookieDomain(): string | undefined {
    const d = this.config.get<string>("AUTH_COOKIE_DOMAIN", { infer: true })?.trim();
    return d ? d : undefined;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName ?? null,
        roles: {
          create: [{ role: Role.USER }]
        }
      }
    });

    await this.audit.log({
      userId: user.id,
      action: "auth.register",
      entityType: "User",
      entityId: user.id,
      note: `email=${user.email}`
    });

    return { userId: user.id };
  }

  private async signAccessToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });
    if (!user) throw new UnauthorizedException();

    const roles = user.roles.map((r) => r.role);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles
    };

    const ttlSeconds = this.getAccessTtlSeconds();
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: ttlSeconds
    });

    return accessToken;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const accessToken = await this.signAccessToken(user.id);
    const refresh = await this.createRefreshToken(user.id);

    await this.audit.log({
      userId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id
    });

    return { accessToken, refreshToken: refresh.rawToken, expiresAt: refresh.expiresAt };
  }

  private async createRefreshToken(userId: string) {
    const rawToken = randomToken(32);
    const tokenHash = sha256(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.getRefreshTtlSeconds() * 1000);

    await this.prisma.userRefreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });

    return { rawToken, expiresAt };
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) throw new UnauthorizedException();

    const tokenHash = sha256(rawRefreshToken);
    const tokenRow = await this.prisma.userRefreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: true } } }
    });

    if (!tokenRow) throw new UnauthorizedException("Invalid refresh token");
    if (tokenRow.revokedAt) {
      // Token reuse attempt. Treat as session theft indicator: revoke all refresh tokens for that user.
      await this.prisma.userRefreshToken.updateMany({
        where: { userId: tokenRow.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      await this.audit.log({
        userId: tokenRow.userId,
        action: "auth.refresh_reuse_detected",
        entityType: "User",
        entityId: tokenRow.userId
      });
      throw new UnauthorizedException("Refresh token revoked");
    }
    if (tokenRow.expiresAt.getTime() < Date.now()) throw new UnauthorizedException("Refresh token expired");

    // Rotate
    await this.prisma.userRefreshToken.update({
      where: { id: tokenRow.id },
      data: { revokedAt: new Date() }
    });

    const accessToken = await this.signAccessToken(tokenRow.userId);
    const refresh = await this.createRefreshToken(tokenRow.userId);

    await this.audit.log({
      userId: tokenRow.userId,
      action: "auth.refresh",
      entityType: "User",
      entityId: tokenRow.userId
    });

    return { accessToken, refreshToken: refresh.rawToken, expiresAt: refresh.expiresAt };
  }

  async logout(rawRefreshToken: string | undefined) {
    const token = (rawRefreshToken ?? "").trim();
    if (token) {
      const tokenHash = sha256(token);
      const row = await this.prisma.userRefreshToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true } });
      if (row) {
        await this.prisma.userRefreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
        await this.audit.log({
          userId: row.userId,
          action: "auth.logout",
          entityType: "User",
          entityId: row.userId
        });
      }
    }
    return { ok: true };
  }

  async linkSupabaseIdentity(params: { userId: string; claims: SupabaseJwtClaims }) {
    const supabaseUserId = params.claims.sub;
    const email = params.claims.email?.trim().toLowerCase();
    if (!supabaseUserId || !email) throw new BadRequestException("Invalid Supabase claims");

    // Prevent linking a Supabase identity that's already linked to someone else.
    const existingBySupabase = await this.prisma.user.findUnique({
      where: { supabaseUserId },
      select: { id: true, email: true }
    });
    if (existingBySupabase && existingBySupabase.id !== params.userId) {
      throw new BadRequestException("Supabase user already linked to another account");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, supabaseUserId: true }
    });
    if (!user) throw new BadRequestException("User not found");

    if (user.email.toLowerCase() !== email) {
      throw new BadRequestException("Supabase email does not match current user");
    }

    if (user.supabaseUserId && user.supabaseUserId !== supabaseUserId) {
      throw new BadRequestException("Account already linked to a different Supabase user");
    }

    if (!user.supabaseUserId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { supabaseUserId }
      });

      await this.audit.log({
        userId: user.id,
        action: "auth.supabase_link",
        entityType: "User",
        entityId: user.id,
        note: `supabaseUserId=${supabaseUserId}`
      });
    }

    return { ok: true, supabaseUserId };
  }

  private async loadIdentityForUser(userId: string, supabaseUserId?: string | null): Promise<AuthenticatedIdentity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });
    if (!user) throw new UnauthorizedException("User not found");
    return {
      sub: user.id,
      email: normalizeEmail(user.email),
      roles: user.roles.map((r) => r.role),
      authSource: "supabase",
      supabaseUserId: supabaseUserId ?? user.supabaseUserId ?? null
    };
  }

  async syncSupabaseIdentity(params: { claims: SupabaseJwtClaims }) {
    const supabaseUserId = params.claims.sub?.trim();
    const email = normalizeEmail(params.claims.email ?? "");
    if (!supabaseUserId || !email) {
      throw new BadRequestException("Invalid Supabase claims");
    }

    const bySupabase = await this.prisma.user.findUnique({
      where: { supabaseUserId },
      select: { id: true }
    });
    if (bySupabase) {
      const identity = await this.loadIdentityForUser(bySupabase.id, supabaseUserId);
      return { ok: true, action: "existing", identity };
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, supabaseUserId: true }
    });
    if (byEmail) {
      if (byEmail.supabaseUserId && byEmail.supabaseUserId !== supabaseUserId) {
        throw new BadRequestException("Email is linked to a different Supabase account");
      }
      if (!byEmail.supabaseUserId) {
        await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { supabaseUserId }
        });
        await this.audit.log({
          userId: byEmail.id,
          action: "auth.supabase_sync_link",
          entityType: "User",
          entityId: byEmail.id,
          note: `supabaseUserId=${supabaseUserId}`
        });
      }
      const identity = await this.loadIdentityForUser(byEmail.id, supabaseUserId);
      return { ok: true, action: "linked", identity };
    }

    const passwordHash = await bcrypt.hash(randomToken(32), 10);
    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: null,
        supabaseUserId,
        roles: { create: [{ role: Role.USER }] }
      },
      select: { id: true }
    });

    await this.audit.log({
      userId: created.id,
      action: "auth.supabase_sync_provision",
      entityType: "User",
      entityId: created.id,
      note: `supabaseUserId=${supabaseUserId}`
    });

    const identity = await this.loadIdentityForUser(created.id, supabaseUserId);
    return { ok: true, action: "provisioned", identity };
  }
}

