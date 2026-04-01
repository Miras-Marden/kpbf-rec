import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { AnyAuthGuard } from "./any-auth.guard";
import { SupabaseJwtVerifier } from "./supabase-jwt.verifier";
import { AuthIdentityService } from "./auth-identity.service";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_ACCESS_SECRET", { infer: true }),
        signOptions: {
          expiresIn: Number(config.get<number>("JWT_ACCESS_TTL_SECONDS", { infer: true }))
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SupabaseJwtVerifier, AuthIdentityService, AnyAuthGuard],
  exports: [AuthService, SupabaseJwtVerifier, AuthIdentityService, AnyAuthGuard]
})
export class AuthModule {}

