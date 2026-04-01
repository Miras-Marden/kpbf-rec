import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type SupabaseJwtClaims = {
  sub: string;
  email?: string;
  aud?: string | string[];
  iss?: string;
  role?: string;
};

function normalizeBearerToken(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (v.toLowerCase().startsWith("bearer ")) return v.slice(7).trim();
  return v;
}

@Injectable()
export class SupabaseJwtVerifier {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private issuer?: string;
  private audience?: string;
  private enabled = false;

  constructor(private readonly config: ConfigService) {
    const supabaseUrl = this.config.get<string>("SUPABASE_URL", { infer: true })?.trim();
    const explicitJwksUrl = this.config.get<string>("SUPABASE_JWKS_URL", { infer: true })?.trim();
    const jwksUrl =
      explicitJwksUrl ??
      (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/keys` : undefined);

    if (jwksUrl) {
      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
      this.enabled = true;
    }

    this.issuer = this.config.get<string>("SUPABASE_JWT_ISSUER", { infer: true })?.trim();
    this.audience = this.config.get<string>("SUPABASE_JWT_AUD", { infer: true })?.trim();
  }

  isEnabled() {
    return this.enabled;
  }

  async verifyAccessToken(accessToken: string): Promise<SupabaseJwtClaims | null> {
    if (!this.enabled || !this.jwks) return null;
    const token = (accessToken ?? "").trim();
    if (!token) return null;
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer || undefined,
      audience: this.audience || undefined
    });
    return payload as unknown as SupabaseJwtClaims;
  }

  async verifyAuthorizationHeader(authorizationHeader: string | undefined): Promise<SupabaseJwtClaims | null> {
    if (!this.enabled || !this.jwks) return null;
    const token = normalizeBearerToken(authorizationHeader ?? "");
    if (!token) return null;
    return this.verifyAccessToken(token);
  }
}

