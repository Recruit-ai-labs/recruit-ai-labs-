// Bridges the source fix into the built CSS so it can be seen without a
// rebuild — `next build` needs more memory than this machine has free.
//
// It applies exactly the declaration the source change adds, to exactly the
// selectors the source change touches, in .next/static/css/*. A real rebuild
// regenerates these files from the stylesheet and makes this script moot.
//
//   node scripts/patch-built-css.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// The single-column stacks whose implicit `auto` column was being inflated to
// the widest item's min-content — see the comment at .mainColumn in
// src/app/_account/seeker/seeker.module.scss.
const STACKS = [
  "mainColumn",
  "feed",
  "composer",
  "railLeft",
  "railRight",
  "skeleton",
  "queueList",
  "rows",
  "commentList",
  "suggestionList",
  "networkPage",
  "notificationsPage",
  "personList",
  "profilePostList",
  "railPeople",
  "conversationList",
  "bubbleList",
  "noticeList",
  "mentionList",
  "drawerNav",
  // Page and card containers on the other workspace screens, added in the same
  // sweep: they were implicit-column grids too, so each could still be widened
  // by the min-content of a name, a headline or a message line.
  "messagesPage",
  "inbox",
  "threadPane",
  "threadIntro",
  "threadEmpty",
  "inboxEmpty",
  "inboxRowBody",
  "noticeEmpty",
  "noticeBody",
  "mentionBody",
  "settingNav",
  "skeletonStack",
  "suggestionBody",
  "networkStat",
  "personTile",
  "personTileFace",
  "personLineBody",
  "lockCard",
  "lightbox",
  "sheetIdentity",
  "quoteIdentity",
  "shareQuoteText",
];

const PIN = "grid-template-columns:minmax(0,1fr);";
const DIR = ".next/static/css";

let touched = 0;

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".css"))) {
  const path = join(DIR, name);
  const css = readFileSync(path, "utf8");

  const patched = css.replace(
    /\.seeker_([a-zA-Z]+)__[A-Za-z0-9_]+((?:,\.seeker_[a-zA-Z]+__[A-Za-z0-9_]+)*)\{([^}]*)\}/g,
    (whole, base, extra, body) => {
      if (!STACKS.includes(base)) return whole;
      if (!body.includes("display:grid;") && !/^display:grid;$/.test(body)) return whole;
      if (body.includes("grid-template-columns")) return whole;

      touched += 1;
      return whole.replace("display:grid;", "display:grid;" + PIN);
    },
  );

  if (patched !== css) writeFileSync(path, patched);
}

console.log("pinned", touched, "built grid rules");
