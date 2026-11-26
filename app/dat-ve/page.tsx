import type { Metadata } from "next";
import { isCustomerAuthConfigured } from "../../lib/supabase/config.ts";
import { getCurrentAppUser } from "../../lib/supabase/server.ts";
import CustomerBookingSite from "./CustomerBookingSite";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KumhoGo — Đặt vé xe khách",
  description: "Tra cứu chuyến xe, chọn ghế và đặt vé KumhoGo nhanh chóng, an toàn.",
};

export default async function CustomerBookingPage() {
  const user = await getCurrentAppUser();
  return <CustomerBookingSite user={user} authConfigured={isCustomerAuthConfigured()} />;
}
