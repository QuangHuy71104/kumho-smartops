"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./PortalShell.module.css";

const assetSearchHref = "/tai-san#asset-search";

export default function QuickSearch() {
  const router = useRouter();

  useEffect(() => {
    const openAssetSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const searchInput = document.getElementById("asset-search");
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.select();
          return;
        }
        router.push(assetSearchHref);
      }
    };

    window.addEventListener("keydown", openAssetSearch);
    return () => window.removeEventListener("keydown", openAssetSearch);
  }, [router]);

  return (
    <Link
      className={styles.quickSearch}
      href={assetSearchHref}
      aria-label="Mở trang tìm kiếm tài sản"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <span aria-hidden="true">⌕</span>
      <span>Tìm nhanh</span>
      <kbd>Ctrl K</kbd>
    </Link>
  );
}
