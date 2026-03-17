import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND_THEME } from "../src/brandThemeSource.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../src/tokens.css");

const primitiveEntries = Object.entries(BRAND_THEME.primitives);
const primitiveByHex = new Map(
  primitiveEntries.map(([name, value]) => [value.toUpperCase(), name]),
);

function cssColor(value) {
  const primitiveName = primitiveByHex.get(value.toUpperCase());
  return primitiveName ? `var(--pd-p-${primitiveName})` : value;
}

function modeBlock(mode, c) {
  return [
    `[data-theme="${mode}"] {`,
    `  --pd-bg-canvas: ${cssColor(c.bgCanvas)};`,
    `  --pd-bg-surface: ${cssColor(c.bgSurface)};`,
    `  --pd-bg-raised: ${cssColor(c.bgRaised)};`,
    `  --pd-bg-overlay: ${cssColor(c.bgOverlay)};`,
    "",
    `  --pd-border-subtle: ${cssColor(c.divider)};`,
    `  --pd-border-default: ${cssColor(c.borderDefault)};`,
    `  --pd-border-strong: ${cssColor(c.borderStrong)};`,
    "",
    `  --pd-text-primary: ${cssColor(c.textPrimary)};`,
    `  --pd-text-secondary: ${cssColor(c.textSecondary)};`,
    `  --pd-text-muted: ${cssColor(c.textMuted)};`,
    `  --pd-text-on-accent: ${cssColor(c.textOnAccent)};`,
    "",
    `  --pd-accent-primary: ${cssColor(c.accentPrimary)};`,
    `  --pd-accent-primary-hover: ${cssColor(c.accentPrimaryLight)};`,
    `  --pd-accent-primary-muted: ${c.accentPrimaryMuted};`,
    `  --pd-accent-primary-muted-strong: ${c.accentPrimaryMutedStrong};`,
    `  --pd-accent-primary-dark: ${cssColor(c.accentPrimaryDark)};`,
    "",
    `  --pd-accent-secondary: ${cssColor(c.accentSecondary)};`,
    `  --pd-accent-secondary-hover: ${cssColor(c.accentSecondaryLt)};`,
    `  --pd-accent-secondary-muted: ${c.accentSecondaryMuted};`,
    "",
    `  --pd-status-up: ${cssColor(c.statusUp)};`,
    `  --pd-status-up-muted: ${c.statusUpMuted};`,
    `  --pd-status-down: ${cssColor(c.statusDown)};`,
    `  --pd-status-down-muted: ${c.statusDownMuted};`,
    `  --pd-status-pending: ${cssColor(c.statusPending)};`,
    `  --pd-status-pending-muted: ${c.statusPendingMuted};`,
    `  --pd-status-pending-muted-strong: ${c.statusPendingMutedStrong};`,
    `  --pd-status-neutral: ${cssColor(c.statusNeutral)};`,
    `  --pd-status-cancelled: ${cssColor(c.statusCancelled)};`,
    `  --pd-status-partial: ${cssColor(c.statusPartial)};`,
    `  --pd-table-zebra: ${c.tableZebraBg};`,
    `  --pd-table-hover: ${c.tableHoverBg};`,
    "",
    `  --pd-hover: ${c.actionHover};`,
    `  --pd-selected: ${c.actionSelected};`,
    `  --pd-focus: ${c.focus};`,
    `  --pd-disabled: ${c.actionDisabledBg};`,
    "",
    `  --pd-appbar-border: ${c.appbarBorder};`,
    `  --pd-scrollbar-thumb: ${cssColor(c.scrollbarThumb)};`,
    `  --pd-text-on-status: ${cssColor(c.textOnStatus)};`,
    `}`,
  ].join("\n");
}

const primitivesBlock = [
  ":root {",
  ...primitiveEntries.map(([name, value]) => `  --pd-p-${name}: ${value};`),
  "}",
].join("\n");

const baseStyles = `
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--pd-scrollbar-thumb, ${BRAND_THEME.primitives["navy-600"]});
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--pd-border-strong, ${BRAND_THEME.primitives["navy-500"]});
}

.pd-numeric {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
`.trim();

const out = [
  "/*",
  " * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.",
  " * Source of truth: src/brandThemeSource.js",
  " * Regenerate: pnpm -C packages/ui tokens:generate",
  " */",
  "",
  primitivesBlock,
  "",
  modeBlock("dark", BRAND_THEME.modes.dark),
  "",
  modeBlock("light", BRAND_THEME.modes.light),
  "",
  baseStyles,
  "",
].join("\n");

const checkOnly = process.argv.includes("--check");
if (checkOnly) {
  const current = await fs.readFile(outFile, "utf8").catch(() => "");
  if (current !== out) {
    console.error(
      `tokens.css is out of date. Run: pnpm -C packages/ui tokens:generate`,
    );
    process.exit(1);
  }
  console.log(`OK ${path.relative(process.cwd(), outFile)} is up to date`);
  process.exit(0);
}

await fs.writeFile(outFile, out, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outFile)}`);
