import { ConciergeBell, Heart, Star, Utensils } from "lucide-react";
import styles from "./loading.module.css";

const features = [
  { label: "Great food", Icon: Utensils },
  { label: "Better service", Icon: Star },
  { label: "Your feedback matters", Icon: Heart },
];

export default function Loading() {
  return (
    <main
      className={`relative flex min-h-dvh items-center justify-center overflow-hidden ${styles.screen}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.decorations} aria-hidden="true">
        <span className={styles.topCurve} />
        <span className={styles.bottomCurve} />
        <span className={`${styles.leaf} ${styles.leafOne}`} />
        <span className={`${styles.leaf} ${styles.leafTwo}`} />
        <span className={`${styles.leaf} ${styles.leafThree}`} />
        <span className={`${styles.leaf} ${styles.leafFour}`} />
        <span className={`${styles.speck} ${styles.speckOne}`} />
        <span className={`${styles.speck} ${styles.speckTwo}`} />
        <span className={`${styles.speck} ${styles.speckThree}`} />
        <span className={`${styles.speck} ${styles.speckFour}`} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[430px] px-5 py-16 text-center">
        <div className={styles.loader} aria-hidden="true">
          <div className={styles.rings} />
          <svg className={styles.arc} viewBox="0 0 200 200" fill="none">
            <path
              d="M 100 24 A 76 76 0 0 1 157 50"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="163" cy="58" r="3.6" fill="currentColor" />
          </svg>
          <div className={styles.center}>
            <Heart size={20} fill="currentColor" strokeWidth={1.5} />
            <ConciergeBell size={54} strokeWidth={1.7} />
          </div>
        </div>

        <h1 className={styles.heading}>Getting things ready</h1>
        <p className={styles.subtitle}>Loading your experience...</p>
        <div
          className={`flex items-center justify-center gap-3 ${styles.dots}`}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>

        <div
          className={`grid grid-cols-3 ${styles.features}`}
          aria-hidden="true"
        >
          {features.map(({ label, Icon }) => (
            <div key={label} className={styles.feature}>
              <div className={styles.featureIcon}>
                <Icon size={23} strokeWidth={1.8} />
              </div>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
