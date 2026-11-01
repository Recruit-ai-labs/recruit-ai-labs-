// One JSON POST, and the error it can carry.
//
// Every social button — accept, decline, connect, follow, send, mark read —
// talks to a route that answers either the new state or `{ error }`. This is
// the one place that turns the second into a thrown `Error`, so no component
// has to remember to check `response.ok` and dig the message out.

export async function postJson<T>(
  url: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) throw new Error(data.error ?? "That did not go through.");

  return data as T;
}

/** A failed request's sentence, or one that fits most failures. */
export function messageOf(problem: unknown) {
  return problem instanceof Error ? problem.message : "That did not go through.";
}
