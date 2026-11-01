// Builds a static probe of the pasted /seeker HTML: keeps the real markup and
// the compiled stylesheet links, drops every script, and swaps the Suspense
// skeleton for the resolved feed content so the layout measures for real.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC =
  "d:\\Temp\\aicoding-text-field\\4148b407-e2ef-4670-b61f-e006bcd365ca\\text-field-content-7e1384ae-a3b5-4a82-85ae-78e33e6bef22-5375ddcc-25e9-4836-81ee-0645db17c4b1.txt";

const raw = readFileSync(SRC, "utf8");

// Slice by marker rather than by regex: the resolved buffer is a div of nested
// divs, so the first `</div></div>` it hits is not the one that closes it.
const start = raw.indexOf('<div hidden id="S:1">');
const end = raw.indexOf("<script>$RS=");
if (start < 0 || end < 0) throw new Error("markers not found");

const resolved = raw.slice(start + '<div hidden id="S:1">'.length, end).replace(/<\/div>$/, "");

let html = raw.replace(/<script[\s\S]*?<\/script>/g, "");
html = html.replace(/<dialog[\s\S]*?<\/dialog>/, "");
html = html.slice(0, html.indexOf('<div hidden id="S:1">')) + html.slice(html.indexOf("<script>$RS=") >= 0 ? html.length : html.length);

// The visible <main> still carries the streaming skeleton; put the real page
// in its place so the measurement sees the feed, not the placeholder.
const slotStart = html.indexOf('<div class="seeker_pageSlot__');
const slotEnd = html.indexOf("</main>");
html =
  html.slice(0, slotStart) +
  html.slice(slotStart, html.indexOf(">", slotStart) + 1) +
  resolved +
  "</div>" +
  html.slice(slotEnd);

// Root-relative asset URLs have to become absolute once the page is served
// from the probe port, or the compiled stylesheets would not resolve and the
// measurement would be of an unstyled document.
html = html.replace(/href="\/(?!\/)/g, 'href="http://localhost:3000/');
html = html.replace(/src="\/(?!\/)/g, 'src="http://localhost:3000/');

// The build serves /_next/static as `immutable`, so an edited stylesheet would
// still come back from the browser cache and the measurement would lie. A fresh
// query string per generation forces the CSS that is actually on disk.
const V = Date.now();
html = html.replace(
  /href="(http:\/\/localhost:3000\/_[^"]+\.css)"/g,
  (_m, href) => `href="${href}?v=${V}"`,
);

mkdirSync("public/_probe", { recursive: true });
writeFileSync("public/_probe/seeker.html", html);

console.log(
  "wrote public/_probe/seeker.html:",
  html.length,
  "bytes | resolved buffer:",
  resolved.length,
  "bytes | skeleton left in page:",
  /seeker_skeleton/.test(html.slice(slotStart, html.indexOf("</main>"))),
);
