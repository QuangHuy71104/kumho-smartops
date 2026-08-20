import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "KSOps — IT Service Hub";
  const description = "Bản demo cổng quản trị tài sản, sự cố, bảo trì và giám sát CNTT cho đề tài thực tập lập trình viên.";
  const socialImage = new URL("/og.png", metadataBase);

  return {
    metadataBase,
    title: { default: title, template: "%s · KSOps" },
    description,
    applicationName: "KSOps",
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url: metadataBase,
      siteName: "KSOps",
      title,
      description,
      images: [{ url: socialImage, width: 1792, height: 907, alt: "KSOps IT Service Hub — Demo thực tập" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
