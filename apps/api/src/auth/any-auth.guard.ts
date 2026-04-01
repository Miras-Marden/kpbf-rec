import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthIdentityService } from "./auth-identity.service";

@Injectable()
export class AnyAuthGuard implements CanActivate {
  constructor(private readonly identities: AuthIdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authorization = (req.headers?.authorization as string | undefined) ?? undefined;
    const identity = await this.identities.resolveOrThrow(authorization);
    req.user = identity;
    return true;
  }
}

