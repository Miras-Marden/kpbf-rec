import Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().integer().min(1).max(65535).default(4000),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).max(60 * 60 * 24).default(60 * 15),

  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(60 * 60).max(60 * 60 * 24 * 365).default(60 * 60 * 24 * 30),
  JWT_REFRESH_COOKIE_NAME: Joi.string().min(1).default("refreshToken"),
  AUTH_COOKIE_DOMAIN: Joi.string().min(1).optional(),
  AUTH_COOKIE_SAMESITE: Joi.string().valid("lax", "strict", "none").default("lax"),
  AUTH_ENABLE_SUPABASE_AUTOLINK: Joi.boolean().default(false),

  // Comma-separated origins (e.g. "https://kpbf.kz,https://admin.kpbf.kz").
  // In development you can set "*" to allow all.
  CORS_ORIGINS: Joi.string().min(1).default("*"),

  // Whether to trust X-Forwarded-* headers (when behind reverse proxy).
  TRUST_PROXY: Joi.boolean().default(false),

  // Supabase migration bridge (optional in Phase 1).
  // If set, API can accept Supabase JWTs (alongside current JWTs) via AnyAuthGuard.
  SUPABASE_URL: Joi.string().uri().optional(),
  SUPABASE_ANON_KEY: Joi.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().min(20).optional(),
  SUPABASE_JWKS_URL: Joi.string().uri().optional(),
  SUPABASE_JWT_AUD: Joi.string().min(1).optional(),
  SUPABASE_JWT_ISSUER: Joi.string().min(1).optional(),

  SUPABASE_STORAGE_BUCKET_MEDIA: Joi.string().min(1).optional()
}).unknown(true);

