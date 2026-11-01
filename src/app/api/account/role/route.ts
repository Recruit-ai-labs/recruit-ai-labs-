// The role chosen on /choose-account. Only the job seeker side is open,
// so this route accepts one value and refuses the other with a reason
// the browser can show.

import {
  accountFailure,
  chooseRole,
  readAccountBody,
} from "@/lib/account";

export async function POST(request: Request) {
  try {
    const body = await readAccountBody(request);
    const result = await chooseRole(body.role);

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return accountFailure(error);
  }
}
