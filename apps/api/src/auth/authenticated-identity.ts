import type { Role } from "@prisma/client";

export type AuthSource = "local-jwt" | "supabase";

export type AuthenticatedIdentity = {
  sub: string;
  email: string;
  roles: Role[];
  authSource: AuthSource;
  supabaseUserId?: string | null;
};

