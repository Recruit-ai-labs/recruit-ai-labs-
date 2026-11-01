// An edit made on the profile page. The browser sends the whole profile,
// not just the section that was open: one validator protects the whole
// record, and a section cannot be saved into a shape onboarding would have
// refused.

import {
  accountFailure,
  readAccountBody,
  updateSeekerProfile,
} from "@/lib/account";

export async function PATCH(request: Request) {
  try {
    const body = await readAccountBody(request);
    const { profile } = await updateSeekerProfile(body.profile);

    return Response.json(
      { profile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accountFailure(error);
  }
}
