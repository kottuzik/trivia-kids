"use client";

import { AppHeader } from "@/components/AppHeader";
import { ButtonLink } from "@/components/Button";
import { usePreferences } from "@/lib/preferences";
import shared from "../shared.module.css";
import styles from "./page.module.css";

const BADGE_TONES = ["yellow", "pink", "mint", "blue", "lavender"] as const;

export function AboutScreen() {
  const { t } = usePreferences();

  return (
    <>
      <AppHeader showBack />
      <main id="main" className={shared.main}>
        <h1>{t.about.heading}</h1>

        <section className={`${shared.card} ${styles.intro}`} aria-labelledby="app-name">
          <h2 id="app-name" className={styles.appName}>
            {t.meta.appName}
          </h2>
          <p>{t.about.intro}</p>
        </section>

        <section className={shared.card} aria-labelledby="goal-title">
          <h2 id="goal-title" className={styles.sectionTitle}>
            {t.about.goalTitle}
          </h2>
          <p>{t.about.goalText}</p>
          <h2 className={styles.sectionTitle}>{t.about.sourceTitle}</h2>
          <p>{t.about.sourceText}</p>
        </section>

        <section id="how-to-play" className={shared.card} aria-labelledby="how-title">
          <h2 id="how-title">{t.about.howToPlayTitle}</h2>
          <ol className={styles.steps}>
            {t.about.steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span
                  className={`${styles.badge} ${styles[BADGE_TONES[index % BADGE_TONES.length]]}`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className={shared.actions}>
          <ButtonLink href="/quiz">{t.about.toGame}</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {t.about.backHome}
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
