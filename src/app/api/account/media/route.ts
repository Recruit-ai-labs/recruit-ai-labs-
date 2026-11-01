// Upload or remove one of the two profile pictures.
//
// The browser has already re-encoded the file; this is the gate on what
// is allowed to be stored — a real image data URL, under the size the
// table is willing to hold, for a kind that exists. An empty `data` is a
// removal, not a failure: taking a picture down has to be possible
// without a second endpoint.

import { AccountError, accountFailure, readAccount, readAccountBody } from "@/lib/account";
import { clearMedia, isImageData, saveMedia } from "@/lib/media";
import { isMediaKind, MAX_MEDIA_LENGTH } from "@/lib/media-types";

export async function POST(request: Request) {
  try {
    const body = await readAccountBody(request, MAX_MEDIA_LENGTH + 200_000);
    const kind = body.kind;

    if (!isMediaKind(kind)) throw new AccountError("Choose a picture to change.");

    const account = await readAccount();
    if (!account) throw new AccountError("Sign in to continue.", 401);

    const data = typeof body.data === "string" ? body.data : "";

    if (!data) {
      await clearMedia(account.userId, kind);
      return Response.json(
        { media: { kind, updated: 0 } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!isImageData(data)) {
      throw new AccountError("Choose a JPEG, PNG or WebP image.");
    }
    if (data.length > MAX_MEDIA_LENGTH) {
      throw new AccountError("That picture is still too large. Try another one.", 413);
    }

    const media = await saveMedia(account.userId, kind, data);

    return Response.json({ media }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return accountFailure(error);
  }
}
