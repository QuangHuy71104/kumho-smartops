export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return { url: parsed.origin, publishableKey };
  } catch {
    return null;
  }
}

export function isCustomerAuthConfigured() {
  return getSupabasePublicConfig() !== null;
}
