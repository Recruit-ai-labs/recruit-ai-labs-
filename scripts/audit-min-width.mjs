// Audits the shipped CSS for the two declarations that can force a page wider
// than the viewport: a grid with no explicit column track (so its single
// implicit `auto` column is pinned to the widest item's min-content), and a
// fixed width floor that a phone cannot satisfy. Aggregates per selector,
// because a rule inside a media query may supply the track for a grid declared
// outside one.
//
//   node scripts/audit-min-width.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = ".next/static/css";
const RULE = /([^{}]+)\{([^{}]*)\}/g;

const bySelector = new Map();

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(DIR, name), "utf8");
  for (const [, rawSel, body] of css.matchAll(RULE)) {
    const sel = rawSel.trim();
    if (!sel || sel.startsWith("@") || sel === "from" || sel === "to") continue;
    for (const one of sel.split(",").map((s) => s.trim())) {
      if (!one) continue;
      const prev = bySelector.get(one) || "";
      bySelector.set(one, prev + body);
    }
  }
}

const implicitGrids = [];
const hardFloors = [];
const nowrapUnclipped = [];

for (const [sel, body] of bySelector) {
  const grid = /(^|;)display:grid;/.test(body);
  const cols = /grid-template-columns:/.test(body);
  if (grid && !cols) implicitGrids.push(sel);

  // `white-space:nowrap` is only safe when the same element also clips.
  // Otherwise the line paints past its box and still widens the page, tracked
  // column or not.
  if (/white-space:nowrap;/.test(body) && !/overflow:(hidden|clip|auto|scroll);/.test(body)) {
    nowrapUnclipped.push(sel);
  }

  const px = [
    // `width` and `min-width` are floors; `max-width` is the opposite, and a
    // plain substring match would flag every centred shell on the site.
    ...[...body.matchAll(/(?:^|;)(?:min-)?width:(\d+)px/g)].map((m) => +m[1]),
  ];
  const nowrap = /white-space:nowrap;/.test(body);
  const floor = px.filter((p) => p > 300);
  if (floor.length || (nowrap && /width:/.test(body))) {
    hardFloors.push({ sel, floor, nowrap });
  }
}

console.log("implicit grids (no column track):", implicitGrids.length);
implicitGrids.forEach((s) => console.log("  ", s));
console.log("\nfixed floors / unbreakable lines:", hardFloors.length);
hardFloors.forEach((h) => console.log("  ", h.sel, JSON.stringify(h)));
console.log("\nnowrap without clipping:", nowrapUnclipped.length);
nowrapUnclipped.forEach((s) => console.log("  ", s));
