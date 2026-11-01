// Serves the static /seeker probe on its own port so a browser iframe can read
// it same-origin. Diagnostic only: nothing in the app imports it.
//   node scripts/probe-server.mjs   →   http://localhost:4500/
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const FILE = "public/_probe/seeker.html";

createServer((_request, response) => {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(readFileSync(FILE));
}).listen(4500, () => console.log("probe on http://localhost:4500/"));
