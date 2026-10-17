import { expect, it } from "vitest";
import { palette } from "../src/lib/theme";

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
it.each([
  [palette.text, palette.background],
  [palette.textMuted, palette.background],
  [palette.textSoft, palette.background],
  [palette.primaryHover, palette.primarySoft],
  [palette.primary, palette.surface],
])("mantiene contraste legible entre %s y %s", (text, background) => {
  const a = luminance(text),
    b = luminance(background);
  expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
});
