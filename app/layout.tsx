import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono } from "next/font/google";
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
const title = "KSOps — IT Service Hub";
const description = "Bản demo cổng quản trị tài sản, sự cố, bảo trì và giám sát CNTT cho đề tài thực tập lập trình viên.";

export const metadata: Metadata = {
  metadataBase,
  title: { default: title, template: "%s · KSOps" },
  description,
  applicationName: "KSOps",
  robots: { index: false, follow: false, noarchive: true },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "KSOps",
    title,
    description,
    images: [{ url: "/og.png", width: 1792, height: 907, alt: "KSOps IT Service Hub — Demo thực tập" }],
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
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
