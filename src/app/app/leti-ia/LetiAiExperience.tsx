"use client";

import { useEffect, useRef, useState } from "react";
import { LearningField } from "./LearningField";
import { LEARNING_PHRASES } from "./learningPhrases";
import styles from "./LetiAiExperience.module.css";
import { LETI_AI_PHRASE_DELAY_MIN, LETI_AI_PHRASE_DELAY_RANGE } from "./learningTiming";

const RECENT_PHRASE_LIMIT = 10;

function nextPhraseIndex(current: number, recent: readonly number[]) {
  let candidate = current;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    candidate = Math.floor(Math.random() * LEARNING_PHRASES.length);
    if (candidate !== current && !recent.includes(candidate)) return candidate;
  }

  return (current + 1) % LEARNING_PHRASES.length;
}

export function LetiAiExperience() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  const recentPhrases = useRef<number[]>([0]);
  const phrase = LEARNING_PHRASES[phraseIndex];

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setTimeout> | undefined;
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const scheduleRotation = () => {
      rotationTimer = setTimeout(() => {
        setPhraseVisible(false);
        transitionTimer = setTimeout(() => {
          setPhraseIndex((current) => {
            const next = nextPhraseIndex(current, recentPhrases.current);
            recentPhrases.current = [...recentPhrases.current, next].slice(-RECENT_PHRASE_LIMIT);
            return next;
          });
          setPhraseVisible(true);
          if (!cancelled) scheduleRotation();
        }, 240);
      }, LETI_AI_PHRASE_DELAY_MIN + Math.random() * LETI_AI_PHRASE_DELAY_RANGE);
    };

    scheduleRotation();
    return () => {
      cancelled = true;
      if (rotationTimer) clearTimeout(rotationTimer);
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, []);

  return (
    <section className={styles.page} aria-labelledby="leti-ai-heading">
      <div className={styles.activity}>
        <span className={styles.activityDot} aria-hidden="true" />
        <p className={`${styles.activityText}${phraseVisible ? "" : ` ${styles.activityTextHidden}`}`}>
          <span className={styles.activityLabel}>Apprentissage&nbsp;: </span>
          <span className={styles.activitySubject}>{phrase.text}</span>
        </p>
      </div>

      <div className={styles.experience}>
        <LearningField category={phrase.category} />

        <div className={styles.copy}>
          <h1 id="leti-ai-heading" className={styles.heading}>
            <span className={styles.headingLine}>LETI apprend</span>{" "}
            <span className={styles.headingLine}>et se prépare à comprendre votre métier.</span>
          </h1>

          <div className={styles.availability} aria-label="Bientôt disponible">
            <svg
              className={styles.clock}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>Bientôt disponible</span>
          </div>
        </div>
      </div>

      <p className={styles.trust}>
        <span className={styles.trustLine}>Merci pour votre confiance.</span>
        <span className={styles.trustLine}>LETI travaille chaque jour pour vous offrir l’IA la plus utile du métier de pisciniste.</span>
      </p>
    </section>
  );
}
