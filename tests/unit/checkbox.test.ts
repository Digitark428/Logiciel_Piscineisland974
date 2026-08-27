import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox LETI", () => {
  it("conserve un véritable input checkbox et ses attributs de formulaire", () => {
    const html = renderToStaticMarkup(createElement(Checkbox, {
      name: "permission",
      value: "tasks.view",
      defaultChecked: true,
      disabled: true,
      tone: "selection",
    }));

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="permission"');
    expect(html).toContain('value="tasks.view"');
    expect(html).toContain("checked");
    expect(html).toContain("disabled");
  });

  it("annonce l’état intermédiaire aux technologies d’assistance", () => {
    const html = renderToStaticMarkup(createElement(Checkbox, {
      indeterminate: true,
      "aria-label": "Sélection partielle",
    }));
    expect(html).toContain('aria-checked="mixed"');
    expect(html).toContain('aria-label="Sélection partielle"');
  });
});
