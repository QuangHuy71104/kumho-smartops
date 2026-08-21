"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./PortalShell.module.css";

const orderSearchHref = "/don-hang#order-search";

export default function QuickSearch() {
  const router = useRouter();

  useEffect(() => {
    const openOrderSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const searchInput = document.getElementById("order-search");
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.select();
          return;
        }
        router.push(orderSearchHref);
      }
    };

    window.addEventListener("keydown", openOrderSearch);
    return () => window.removeEventListener("keydown", openOrderSearch);
  }, [router]);

  return (
    <Link
      className={styles.quickSearch}
      href={orderSearchHref}
      aria-label="Mở trang tìm kiếm đơn hàng"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <span aria-hidden="true">⌕</span>
      <span>Tìm nhanh</span>
      <kbd>Ctrl K</kbd>
    </Link>
  );
}
