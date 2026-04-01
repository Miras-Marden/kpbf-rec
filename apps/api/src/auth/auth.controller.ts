import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Response } from "express";
import { Roles } from "../rbac/roles.decorator";
import { Role } from "@prisma/client";
import { CurrentUser } from "./current-user.decorator";
import type { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AnyAuthGuard } from "./any-auth.guard";
import { LinkSupabaseDto } from "./dto/link-supabase.dto";
import { SupabaseJwtVerifier } from "./supabase-jwt.verifier";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly supabaseJwt: SupabaseJwtVerifier
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto) {
    const res = await this.auth.register(dto);
    return { ...res };
  }

  @Post("login")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, expiresAt } = await this.auth.login(dto);

    const cookieName = this.auth.getRefreshCookieName();
    const sameSite = this.auth.getCookieSameSite();
    const secure = sameSite === "none" ? true : this.auth.isCookieSecure();
    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      sameSite,
      secure,
      domain: this.auth.getCookieDomain(),
      path: "/auth",
      expires: expiresAt
    });

    return { accessToken };
  }

  @Post("refresh")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.auth.getRefreshCookieName();
    const raw = (req.cookies?.[cookieName] as string | undefined) ?? "";
    const { accessToken, refreshToken, expiresAt } = await this.auth.refresh(raw);

    const sameSite = this.auth.getCookieSameSite();
    const secure = sameSite === "none" ? true : this.auth.isCookieSecure();
    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      sameSite,
      secure,
      domain: this.auth.getCookieDomain(),
      path: "/auth",
      expires: expiresAt
    });

    return { accessToken };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.auth.getRefreshCookieName();
    const raw = (req.cookies?.[cookieName] as string | undefined) ?? "";
    await this.auth.logout(raw);

    const sameSite = this.auth.getCookieSameSite();
    const secure = sameSite === "none" ? true : this.auth.isCookieSecure();
    res.cookie(cookieName, "", {
      httpOnly: true,
      sameSite,
      secure,
      domain: this.auth.getCookieDomain(),
      path: "/auth",
      expires: new Date(0)
    });
    return { ok: true };
  }

  @UseGuards(AnyAuthGuard)
  @Get("me")
  @Roles(Role.ADMIN, Role.EDITOR, Role.USER)
  async me(@CurrentUser() user: { sub: string; email: string; roles: Role[] }) {
    return user;
  }

  @UseGuards(AnyAuthGuard)
  @Post("supabase/link")
  async linkSupabase(
    @CurrentUser() user: { sub: string },
    @Body() dto: LinkSupabaseDto
  ) {
    if (!this.supabaseJwt.isEnabled()) {
      return {
        ok: false,
        reason: "SUPABASE_JWKS_URL/SUPABASE_URL not configured"
      };
    }

    const claims = await this.supabaseJwt.verifyAccessToken(dto.supabaseAccessToken);
    if (!claims?.sub || !claims.email) {
      return {
        ok: false,
        reason: "Invalid supabase token"
      };
    }

    return this.auth.linkSupabaseIdentity({
      userId: user.sub,
      claims
    });
  }
}

