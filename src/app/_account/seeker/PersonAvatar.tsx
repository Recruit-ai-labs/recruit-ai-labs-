import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  The person disc.
//
//  A photograph when there is one, initials when there is not: the same
//  mark in the bar, the account menu, the drawer, the home profile card
//  and the profile hero — which is why it lives here instead of in each
//  of them. `src` is the short address a stored picture is read from, so
//  the disc never has to carry a data URL around.
// ------------------------------------------------------------------

export type AvatarPerson = {
  firstName: string;
  lastName: string;
  email?: string;
  /**
   * A full name, when that is all the caller has — a feed author arrives
   * as one string, and splitting it here keeps every disc consistent.
   */
  name?: string;
};

/** Two initials, or the first letter of the email when there is no name. */
export function initialsOf(person: AvatarPerson) {
  const words = person.name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (words.length) {
    return `${words[0].charAt(0)}${words[1]?.charAt(0) ?? ""}`.toUpperCase();
  }

  const letters =
    `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.trim() ||
    (person.email ?? "").charAt(0) ||
    "?";

  return letters.toUpperCase();
}

export default function PersonAvatar({
  person,
  src,
  large = false,
  hero = false,
  className,
}: {
  person: AvatarPerson;
  /** An uploaded photograph. Falls back to initials when absent. */
  src?: string | null;
  large?: boolean;
  /** The profile hero size — a third larger than the bar and the menu. */
  hero?: boolean;
  /** Placement lives with the caller: overlap, ring, border. */
  className?: string;
}) {
  return (
    <span
      className={[
        styles.avatar,
        large ? styles.avatarLarge : "",
        hero ? styles.avatarHero : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.avatarImg} src={src} alt="" />
      ) : (
        initialsOf(person)
      )}
    </span>
  );
}
