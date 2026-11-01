"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// --------------------------------------------------------------------------
//  Navigation progress — the instant answer to "did my click work?"
//
//  Mounted once in the root layout, so it covers every route: the landing
//  page, the auth screens, the policies, the signed-in workspace. It is not
//  a loading screen and it never blocks: it is the 2px rule that appears the
//  moment an internal link is clicked and the small mark in the corner that
//  breathes until the next route paints.
//
//  Why a click listener instead of Link's own status hook: those hooks only
//  know about the Link they are rendered inside. A click can also start a
//  navigation from Clerk's widget, a router.push inside a submit handler, or
//  the browser's back/forward buttons — and all of those should get the same
//  feedback. One capture-phase listener sees every one of them.
//
//  External links, mailto:, tel:, new-tab clicks and hash links are ignored:
//  they never load a new route, so a progress bar for them would be a lie.
// --------------------------------------------------------------------------

export default function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Starting a navigation: light the bar. Nothing cancels it except the next
  // pathname or the safety timeout below — the request for the new route is
  // not observable from here, so the route itself is the finish line.
  useEffect(() => {
    function begin() {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      startedAt.current = Date.now();
      setActive(true);

      // If the target never arrives (offline, a redirect loop, a Clerk
      // hand-off that bounces), the bar must not spin forever. At 20s the
      // visitor is told the truth rather than shown a permanent lie.
      hideTimer.current = setTimeout(() => setActive(false), 20_000);
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
      if (event.shiftKey || event.altKey || event.defaultPrevented) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.hasAttribute("download")) return;
      if ((anchor as HTMLAnchorElement).target === "_blank") return;
      if (anchor.getAttribute("aria-disabled") === "true") return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Same-page jumps and anything that leaves the app are not navigations
      // this bar can speak for.
      if (href.startsWith("#") || /^(mailto|tel|sms|javascript):/i.test(href)) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      // A link that only changes the hash is a scroll, not a page load.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      begin();
    }

    function onPopState() {
      begin();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Finishing: the new route committed, so run the bar out and fade it. The
  // hold keeps a fast transition from flashing a line into existence for a
  // single frame, which reads as a glitch rather than as progress.
  useEffect(() => {
    if (!active) return;

    const elapsed = Date.now() - startedAt.current;
    const settle = Math.max(0, 260 - elapsed);

    const timer = setTimeout(() => {
      setActive(false);
      hideTimer.current = null;
    }, settle);

    return () => clearTimeout(timer);
  }, [pathname, active]);

  return (
    <>
      {/* The rule. `aria-hidden` because it carries no information a screen
          reader can act on — assistive tech gets the page, not the spinner. */}
      <div className="nav-progress" data-active={active} aria-hidden="true">
        <span className="nav-progress-bar" />
      </div>

      {/* The mark, top-right: visible on ink and on paper alike because it
          draws its own dark disc behind the dot. */}
      <div className="nav-pending" data-active={active} aria-hidden="true">
        <span className="nav-pending-ring" />
      </div>
    </>
  );
}
