import { describe, expect, it } from "vitest";
import { LEARNING_PHRASES } from "@/app/app/leti-ia/learningPhrases";

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
});
