import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { AnyAuthGuard } from "./any-auth.guard";

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
  providers: [AuthService, JwtStrategy, AnyAuthGuard],
  exports: [AuthService, AnyAuthGuard]
})
export class AuthModule {}

