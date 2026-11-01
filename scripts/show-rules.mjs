// Prints every built-CSS rule that mentions a set of selector bases, so the
// source sweep can judge each flagged grid on its actual declarations instead
// of on the class name alone.
//   node scripts/show-rules.mjs settingNav messagesPage ...
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const wanted = process.argv.slice(2);
const files = readdirSync(".next/static/css").filter((f) => f.endsWith(".css"));

for (const name of wanted) {
  const seen = new Set();
  for (const file of files) {
    const css = readFileSync(join(".next/static/css", file), "utf8");
    for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!new RegExp("\\." + "[a-z]+_" + name + "__").test(sel)) continue;
      seen.add(sel.trim() + "{" + body + "}");
    }
  }
  console.log("### " + name);
  for (const rule of seen) console.log("   ", rule);
  console.log("");
}
