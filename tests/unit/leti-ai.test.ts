import { describe, expect, it } from "vitest";
import { LEARNING_PHRASES } from "@/app/app/leti-ia/learningPhrases";
import {
  LETI_AI_PHRASE_DELAY_MAX,
  LETI_AI_PHRASE_DELAY_MIN,
} from "@/app/app/leti-ia/learningTiming";

describe("Bibliothèque d’apprentissage LETI IA", () => {
  it("contient 180 sujets uniques avec une répartition professionnelle de 80/20", () => {
    const humorous = LEARNING_PHRASES.filter((phrase) => phrase.category === "humor");
    const uniqueTexts = new Set(LEARNING_PHRASES.map((phrase) => phrase.text));

    expect(LEARNING_PHRASES).toHaveLength(180);
    expect(humorous).toHaveLength(36);
    expect(uniqueTexts.size).toBe(LEARNING_PHRASES.length);
  });

  it("utilise toujours l’orthographe LETI dans les formulations qui nomment le produit", () => {
    const productMentions = LEARNING_PHRASES.filter((phrase) => /leti/i.test(phrase.text));

    expect(productMentions.length).toBeGreaterThan(0);
    expect(productMentions.every((phrase) => !/lity|lety|liti|letty/i.test(phrase.text))).toBe(true);
  });

  it("fait défiler les phrases environ 1,5 fois plus vite", () => {
    expect(LETI_AI_PHRASE_DELAY_MIN).toBeCloseTo(2800 / 1.5, 0);
    expect(LETI_AI_PHRASE_DELAY_MAX).toBeCloseTo(3900 / 1.5, 0);
  });
});
