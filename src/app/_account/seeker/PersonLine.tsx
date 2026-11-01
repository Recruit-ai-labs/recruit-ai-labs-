import Link from "next/link";
import type { ReactNode } from "react";

import type { PersonCard } from "@/lib/social-types";

import PersonAvatar from "./PersonAvatar";
import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  One person, one row.
//
//  The network page, the inbox, the bell and the home rail all print the
//  same thing: a face, a name, a headline, the reason this person is on
//  screen, and the one or two buttons that belong to the section they are
//  in. The row owns only the first four — the buttons arrive as children,
//  because accepting an invitation and opening a thread are not the same
//  action and should not pretend to be.
//
//  The link covers the face and the words, never the buttons: a control
//  nested inside a link is the one accessibility mistake this row could
//  make, and it is the easiest to avoid.
// ------------------------------------------------------------------

/** The avatar shape a `PersonCard` needs. */
export function personOf(person: PersonCard) {
  return { firstName: "", lastName: "", name: person.name };
}

/** Why this person is being suggested — mutuals first, then the city. */
export function reasonOf(person: PersonCard) {
  if (person.mutual > 0) {
    return `${person.mutual} mutual ${person.mutual === 1 ? "connection" : "connections"}`;
  }

  if (person.city) return `Also in ${person.city}`;
  if (person.username) return `@${person.username}`;

  return "On Recruit AI";
}

export default function PersonLine({
  person,
  note,
  children,
}: {
  person: PersonCard;
  /** Overrides the derived reason. */
  note?: string;
  /** The row's own buttons. */
  children?: ReactNode;
}) {
  return (
    <li className={styles.personLine}>
      <Link
        href={`/seeker/people/${person.id}`}
        className={styles.personLineLink}
        aria-label={`Open ${person.name}'s profile`}
      >
        <PersonAvatar person={personOf(person)} src={person.photo} />

        <span className={styles.personLineBody}>
          <strong className={styles.personLineName}>{person.name}</strong>
          <span className={styles.personLineHeadline}>
            {person.headline || (person.username ? `@${person.username}` : "On Recruit AI")}
          </span>
          <span className={styles.personLineNote}>{note ?? reasonOf(person)}</span>
        </span>
      </Link>

      {children ? <div className={styles.personLineActions}>{children}</div> : null}
    </li>
  );
}
