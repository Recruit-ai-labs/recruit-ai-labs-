"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";

// --------------------------------------------------------------------------
//  A Link that answers the click.
//
//  `useLinkStatus` reports whether the route this Link points at is still in
//  flight. While it is, the button's own glyph — the arrow it drew all along —
//  becomes a small breathing dot: the acknowledgement lands on the thing that
//  was clicked, in the same frame as the click, in the slot the arrow already
//  occupied, so the button cannot shift or reflow mid-gesture.
//
//  Why a pulse rather than the turning ring it used to be: a rotation claims a
//  lap, and the lap has no relation to how long the route will take. A dot
//  that fades in and out only ever says "still working" — and it never looks
//  like the page has hung on a slow connection.
//
//  This is the per-button half of the signal. NavProgress.tsx is the other
//  half: a navigation can also start from Clerk's widget or the browser's back
//  button, where no Link hook can see it, so the top rule covers those. A
//  normal link click lights both, and they read as one gesture.
// --------------------------------------------------------------------------

/**
 * The mark that stands in for the button's own glyph while its route loads.
 *
 * A dot that breathes — opacity only, no rotation, no arc to chase. It takes
 * the button's type scale (`em` sizing) and its colour (currentColor), so it
 * inherits each button's ink/paper pairing without a line of configuration.
 */
export function ButtonSpinner() {
  return (
    <span className="btn-pulse" aria-hidden="true">
      <span className="btn-pulse-core" />
    </span>
  );
}

/**
 * Everything a plain anchor takes, minus the three props handled here — so a
 * navigation control can still carry `aria-current`, `onClick`, `title` and
 * the rest without the component having to grow a prop per attribute.
 */
type PendingLinkProps = Omit<
  ComponentProps<"a">,
  "href" | "className" | "children"
> & {
  href: string;
  className?: string;
  children: ReactNode;
  /** The mark to show while the route loads. */
  pending?: ReactNode;
  /**
   * How the mark is delivered:
   *   true  — it stands in for the button's trailing glyph (its arrow), taking
   *           exactly the slot the arrow held. Nothing is added, so nothing
   *           can shift.
   *   false — it is appended beside the label, collapsed to zero width until
   *           the click. This is the shape for a button with no arrow to give
   *           up, such as Clerk's session panel.
   */
  swapGlyph?: boolean;
  // Same escape hatch Link offers: the landing page renders its links through
  // motion.a, and a Link that loses that transform would lose the intro.
  as?: ComponentType<any> | string;
};

export default function PendingLink({
  href,
  className,
  as,
  children,
  pending,
  swapGlyph,
  ...rest
}: PendingLinkProps) {
  const Inner = as ?? Link;

  // Rendered inside Link's context, which is where the hook reads from.
  function StateChild({ children: inner }: { children: ReactNode }) {
    const { pending: busy } = useLinkStatus();

    if (!busy || pending === undefined) return <>{inner}</>;

    // Drop the trailing glyph and park the pulse in its place.
    if (swapGlyph) {
      const withoutGlyph = Array.isArray(inner) ? inner.slice(0, -1) : inner;
      return (
        <>
          {withoutGlyph}
          {pending}
        </>
      );
    }

    return (
      <>
        {inner}
        <span className="btn-spinner-slot">{pending}</span>
      </>
    );
  }

  // `as` swaps the element Link renders; the props it must receive differ, so
  // the pair stays together and the cast stays in one place.
  return (
    <Inner href={href} className={className} {...(rest as any)}>
      <StateChild>{children}</StateChild>
    </Inner>
  );
}
