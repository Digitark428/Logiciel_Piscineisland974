import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const section = z.enum(["clients", "services", "planning", "tasks", "documents"]);
export const appearanceSchema = z.object({
  version: z.literal(1), preset: z.enum(["official", "soft", "intense"]),
  primary: color, secondary: color, backgroundColor: color, surface: color, menu: color, selection: color, card: color,
  background: z.enum(["official", "pool", "coral", "blue-white", "blue-coral", "custom"]),
  opacity: z.number().min(0).max(100), blur: z.number().min(0).max(24), intensity: z.number().min(0).max(100), saturation: z.number().min(0).max(150), brightness: z.number().min(80).max(100),
  cards: z.record(section, z.object({ color, opacity: z.number().min(0).max(100) })),
});
export type Appearance = z.infer<typeof appearanceSchema>;
export const defaults: Appearance = { version: 1, preset: "official", primary: "#5fc6e3", secondary: "#f48b82", backgroundColor: "#f7f7f5", surface: "#ffffff", menu: "#ffffff", selection: "#78d8ec", card: "#ffffff", background: "official", opacity: 80, blur: 12, intensity: 50, saturation: 100, brightness: 100, cards: {} };
export function normalizeAppearance(value: unknown): Appearance {
  const parsed = appearanceSchema.safeParse(value);
  return parsed.success ? parsed.data : defaults;
}
export function themeStyle(a: Appearance): React.CSSProperties {
  const backgrounds = { official: "#f7f7f5", pool: "#eaf8fb", coral: "#fdf0ee", "blue-white": "linear-gradient(135deg, #e5f8fc, #f7f7f5)", "blue-coral": "linear-gradient(135deg, #e5f8fc, #fcece9)", custom: `color-mix(in srgb, ${a.backgroundColor} 22%, white)` };
  const vars: Record<string, string> = {
    "--glass-background": backgrounds[a.background], "--glass-primary": a.primary, "--glass-secondary": a.secondary,
    "--glass-surface-color": `color-mix(in srgb, ${a.surface} ${Math.round(5 + a.intensity * .15)}%, white)`,
    "--glass-menu-color": `color-mix(in srgb, ${a.menu} ${Math.round(5 + a.intensity * .15)}%, white)`,
    "--glass-card-color": `color-mix(in srgb, ${a.card} ${Math.round(5 + a.intensity * .15)}%, color-mix(in srgb, ${a.surface} ${Math.round(5 + (100 - a.brightness) * 1.5)}%, white))`,
    "--glass-selection": `color-mix(in srgb, ${a.selection} ${Math.round(12 + a.intensity * .2)}%, white)`,
    "--glass-opacity": String(Math.max(.86, a.opacity / 100)), "--glass-nav-opacity": String(Math.max(.82, a.opacity / 100)),
    "--glass-blur": `${a.blur}px`, "--glass-saturation": `${a.saturation}%`, "--glass-brightness": `${a.brightness}%`,
  };
  for (const [key, value] of Object.entries(a.cards)) if (value) {
    vars[`--glass-${key}-color`] = `color-mix(in srgb, ${value.color} ${Math.round(5 + a.intensity * .15)}%, white)`;
    vars[`--glass-${key}-opacity`] = String(Math.max(.86, value.opacity / 100));
  }
  return vars as React.CSSProperties;
}
