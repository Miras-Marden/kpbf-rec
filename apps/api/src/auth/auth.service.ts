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

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
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
    if (tokenRow.revokedAt) throw new UnauthorizedException("Refresh token revoked");
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
}

