import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getWorkspacePool } from "../server/db/workspace-pool.ts";
import { getSupabasePublicConfig } from "./config.ts";

export type AppUserRole = "customer" | "admin";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: AppUserRole;
};

export async function createSupabaseServerClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy.ts performs token refreshes.
        }
      },
    },
  });
}

async function profileRole(user: User): Promise<AppUserRole> {
  const result = await getWorkspacePool().query(
    "SELECT role FROM public.app_user_profiles WHERE auth_user_id = $1",
    [user.id],
  );
  return result.rows[0]?.role === "admin" ? "admin" : "customer";
}

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const metadata = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    displayName: typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string" ? metadata.name : data.user.email?.split("@")[0] ?? "Khách hàng",
    avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    role: await profileRole(data.user),
  };
}
