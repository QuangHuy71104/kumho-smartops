import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono } from "next/font/google";
import DemoAccessProvider from "./_components/access/DemoAccessProvider";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
});

function resolveMetadataBase() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const candidate = configuredUrl
    ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");

  try {
    return new URL(candidate);
  } catch {
    return new URL("http://localhost:3000");
  }
}

const metadataBase = resolveMetadataBase();
const title = "KSOps — Transport Control";
const description = "Nền tảng điều hành đội xe, đơn vận chuyển, vé hành khách, hợp đồng và tài chính trên một không gian thống nhất.";

export const metadata: Metadata = {
  metadataBase,
  title: { default: title, template: "%s · KSOps" },
  description,
  applicationName: "KSOps",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "KSOps",
    title,
    description,
    images: [{ url: "/og.png", width: 1659, height: 948, alt: "KSOps Transport Control — Trung tâm điều hành vận tải" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${mono.variable}`}>
        <DemoAccessProvider>{children}</DemoAccessProvider>
      </body>
    </html>
  );
}
