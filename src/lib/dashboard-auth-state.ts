import type { User } from "@supabase/supabase-js";
import type { DashboardSchoolOption } from "@/lib/dashboard-scope";
import type { Perfil, SchoolSubscriptionAccess } from "@/types/database";

export type AuthUserSnapshot = Pick<User, "id" | "email" | "user_metadata">;

export type DashboardInitialAuthState = {
  user: AuthUserSnapshot;
  perfil: Perfil;
  escuelaNombre: string | null;
  sedeNombre: string | null;
  subscriptionAccess: SchoolSubscriptionAccess | null;
  schoolOptions: DashboardSchoolOption[];
  activeEscuelaId: string | null;
};
