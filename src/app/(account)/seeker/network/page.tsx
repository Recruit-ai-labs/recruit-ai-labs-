import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { readAccount } from "@/lib/account";
import { databaseConfigured } from "@/lib/db";
import { readNetworkOverview } from "@/lib/network";
import type { NetworkOverview } from "@/lib/social-types";

import NetworkBoard from "../../../_account/seeker/NetworkBoard";

export const metadata: Metadata = { title: "My Network" };

// The connection graph, read in one pass: the five counters, the
// invitations waiting on an answer, the ones still out, the connections
// already made and the second-degree people worth knowing.
//
// A database that cannot answer costs the page its lists, not the whole
// workspace — the board is drawn empty with the counters at zero rather
// than as an error.
export default async function NetworkPage() {
  const account = await readAccount();
  if (!account) redirect("/sign-in");

  const overview: NetworkOverview = databaseConfigured()
    ? await readNetworkOverview(account.userId).catch(() => null) ?? {
        counts: { connections: 0, incoming: 0, outgoing: 0, followers: 0, following: 0 },
        invitations: [],
        outgoing: [],
        connections: [],
        suggestions: [],
      }
    : {
        counts: { connections: 0, incoming: 0, outgoing: 0, followers: 0, following: 0 },
        invitations: [],
        outgoing: [],
        connections: [],
        suggestions: [],
      };

  return <NetworkBoard overview={overview} />;
}
