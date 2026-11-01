// ------------------------------------------------------------------
//  Shrink a chosen photograph before it is sent.
//
//  Everything that leaves this site is a JSON body, and a modern camera
//  file is 4MB of detail nobody needs at the size it is shown. Re-encode
//  once, width first and quality second, and stop at the first result
//  that fits the caller's budget.
//
//  Browser only: it uses createImageBitmap and a canvas.
// ------------------------------------------------------------------

export type ShrinkOptions = {
  /** The longest edge the result is allowed to have. */
  maxEdge: number;
  /** The most the finished data URL may weigh, in characters. */
  maxLength: number;
};

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const QUALITIES = [0.86, 0.76, 0.64, 0.52];

export async function shrinkImage(
  file: File,
  { maxEdge, maxLength }: ShrinkOptions,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file — PNG, JPEG or WebP.");
  }

  if (file.size > 12_000_000) {
    throw new Error("That photo is over 12 MB. Choose a smaller one.");
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That photo could not be read.");

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("That photo could not be prepared.");

  // A JPEG has no alpha, so transparency is flattened onto white rather
  // than turned black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  for (const quality of QUALITIES) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= maxLength) return url;
  }

  throw new Error("That photo is too detailed to use. Try a smaller one.");
}
