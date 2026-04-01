import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../rbac/roles.decorator";
import { Role } from "@prisma/client";
import { CurrentUser } from "./current-user.decorator";
import type { Request } from "express";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    const res = await this.auth.register(dto);
    return { ...res };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, expiresAt } = await this.auth.login(dto);

    const cookieName = this.auth.getRefreshCookieName();
    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      expires: expiresAt
    });

    return { accessToken };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.auth.getRefreshCookieName();
    const raw = (req.cookies?.[cookieName] as string | undefined) ?? "";
    const { accessToken, refreshToken, expiresAt } = await this.auth.refresh(raw);

    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      expires: expiresAt
    });

    return { accessToken };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieName = this.auth.getRefreshCookieName();
    res.cookie(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      expires: new Date(0)
    });
    return { ok: true };
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me")
  @Roles(Role.ADMIN, Role.EDITOR, Role.USER)
  async me(@CurrentUser() user: { sub: string; email: string; roles: Role[] }) {
    return user;
  }
}

