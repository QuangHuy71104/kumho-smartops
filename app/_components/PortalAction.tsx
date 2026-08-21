import type { ReactNode } from "react";
import styles from "./PortalAction.module.css";

type PortalActionProps = {
  children: ReactNode;
  href: `#${string}`;
  variant?: "primary" | "secondary";
};

export default function PortalAction({
  children,
  href,
  variant = "primary",
}: PortalActionProps) {
  return (
    <a className={`${styles.action} ${styles[variant]}`} href={href}>
      {children}
    </a>
  );
}
