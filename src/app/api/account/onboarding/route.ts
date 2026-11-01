// The onboarding submission. The profile is validated here as well as in
// the browser: the browser's checks are a courtesy, this one is the gate.

import {
  accountFailure,
  readAccountBody,
  saveSeekerProfile,
} from "@/lib/account";

export async function POST(request: Request) {
  try {
    const body = await readAccountBody(request);
    const result = await saveSeekerProfile(body.profile);

    return Response.json(
      { redirect: result.redirect },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accountFailure(error);
  }
}
