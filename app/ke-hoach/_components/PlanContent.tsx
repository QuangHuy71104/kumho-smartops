import styles from "../Roadmap.module.css";
import ArchitectureSection from "./ArchitectureSection";
import DeliverablesSection from "./DeliverablesSection";
import DeliveryCadence from "./DeliveryCadence";
import ExecutiveSummary from "./ExecutiveSummary";
import QualityGatesSection from "./QualityGatesSection";
import RisksSection from "./RisksSection";
import RoadmapSection from "./RoadmapSection";

export default function PlanContent() {
  return (
    <div className={styles.module}>
      <ExecutiveSummary />
      <RoadmapSection />
      <div className={styles.twoColumn}>
        <ArchitectureSection />
        <QualityGatesSection />
      </div>
      <DeliverablesSection />
      <RisksSection />
      <DeliveryCadence />
    </div>
  );
}
