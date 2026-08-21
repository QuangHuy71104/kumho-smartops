import styles from "../Roadmap.module.css";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  note: string;
};

export default function SectionHeading({ eyebrow, title, titleId, note }: SectionHeadingProps) {
  return (
    <div className={styles.sectionHeading}>
      <div><span>{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
      <p>{note}</p>
    </div>
  );
}
