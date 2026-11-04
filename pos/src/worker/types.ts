import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Role } from "../shared/constants";
import type { Tenant } from "./db/control-schema";
import type * as tenantSchema from "./db/tenant-schema";

export type TenantDb = DrizzleD1Database<typeof tenantSchema>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  sessionId: string;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    tenant: Tenant;
    db: TenantDb;
    user: AuthUser;
  };
}
