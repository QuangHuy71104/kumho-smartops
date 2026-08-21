import type { ReactNode } from "react";
import styles from "../page.module.css";

type PanelHeadingProps = {
  kicker: string;
  title: string;
  titleId: string;
  description: string;
  accessory: ReactNode;
};

export function PanelHeading({
  kicker,
  title,
  titleId,
  description,
  accessory,
}: PanelHeadingProps) {
  return (
    <div className={styles.panelHeading}>
      <div>
        <span className={styles.kicker}>{kicker}</span>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </div>
      {accessory}
    </div>
  );
}
