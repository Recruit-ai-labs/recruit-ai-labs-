"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

import PendingLink, { ButtonSpinner } from "@/app/_site/PendingLink";

import FeedSkeleton from "./FeedSkeleton";
import {
  BellIcon,
  CommentIcon,
  HomeIcon,
  NetworkIcon,
  PlusIcon,
  SlidersIcon,
  UserIcon,
} from "./Icons";
import PersonAvatar from "./PersonAvatar";
import SeekerSkeleton from "./SeekerSkeleton";
import styles from "./seeker.module.scss";
import { emptyBadges, type SocialBadges } from "@/lib/social-types";

// ------------------------------------------------------------------
//  The job seeker workspace shell.
//
//  One bar, three destinations, one account menu. The bar follows the
//  reference workspace at D:\New folder: a white sticky rule, icon-over-
//  label destinations, the current one in ink with a two-pixel underline
//  sitting on the rule, the account behind "Me", and everything
//  collapsing into a drawer on small screens.
//
//  A destination answers its click twice, in the same frame, and neither
//  answer is a spinning ring: the icon breathes (the fade-and-return the
//  skeletons use), and the page that was in the middle steps aside for the
//  skeleton of the page that is coming. The bar itself never moves — only
//  the column under it changes shape.
//
//  The site-wide NavProgress rule still covers navigations that do not
//  start from a destination (Clerk's widget, the browser's back button).
// ------------------------------------------------------------------

/** What the bar needs to know about the person signed in. */
export type Viewer = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  /** The uploaded portrait, or null while there is only initials to draw. */
  photo: string | null;
};

type Tab = {
  href: string;
  label: string;
  /** The two-syllable word the mobile bottom bar prints under the icon. */
  short: string;
  /** Home is only Home at exactly `/seeker`; the others own their subtree. */
  exact?: boolean;
  Icon: ComponentType<{ className?: string }>;
  /** Which counter, if any, the bar prints on this destination. */
  badge?: keyof SocialBadges;
};

// Destinations appear here when the screen behind them exists. A tab that
// leads to an unstyled hole is worse than a tab that is not there yet.
//
// The three social destinations sit between the feed and the person: the
// graph, the inbox and the bell are how a reader finds their way back to
// a conversation, and they are what the numbers on the bar measure.
//
// The bottom bar carries the four readers reach one-handed with the compose
// button in the middle, so it draws a smaller set than the top nav: Messaging
// and Settings stay one tap away in the drawer rather than crowded into five
// thumbs-wide slots.
const TABS: readonly Tab[] = [
  { href: "/seeker", label: "Home", short: "Home", exact: true, Icon: HomeIcon },
  { href: "/seeker/network", label: "My Network", short: "Network", Icon: NetworkIcon, badge: "invitations" },
  { href: "/seeker/messages", label: "Messaging", short: "Messages", Icon: CommentIcon, badge: "messages" },
  { href: "/seeker/notifications", label: "Notifications", short: "Alerts", Icon: BellIcon, badge: "notifications" },
  { href: "/seeker/profile", label: "Profile", short: "Me", Icon: UserIcon },
  { href: "/seeker/settings", label: "Settings", short: "Settings", Icon: SlidersIcon },
];

/** The destinations the mobile bar holds either side of the compose button. */
const BOTTOM_LEFT = ["/seeker", "/seeker/network"];
const BOTTOM_RIGHT = ["/seeker/notifications", "/seeker/profile"];

function isCurrent(pathname: string, tab: Tab) {
  if (tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

// ------------------------------------------------------------------
//  Destinations
//
//  A tab answers its own click. While the route it points at is being
//  prepared its icon breathes — full, a third, full — which is the pulse
//  the skeletons already speak, instead of a separate dot parked under the
//  label. The click also reports upward, because the shell draws that
//  route's skeleton in the content area in the same frame.
//
//  The report rides on the click rather than on the pending flag for one
//  reason: following a link in the drawer closes it, so a row that only
//  spoke while it was mounted would be gone before it could say anything.
// ------------------------------------------------------------------

/** How long a committed page waits before it may replace its skeleton. */
const SKELETON_MIN_MS = 240;

/** A route that never commits must not leave a skeleton standing. */
const SKELETON_FAILSAFE_MS = 8000;

function TabFace({
  tab,
  variant,
  current,
  index,
  badge = 0,
}: {
  tab: Tab;
  variant: "nav" | "drawer" | "bottom";
  current: boolean;
  index?: number;
  badge?: number;
}) {
  // Read inside the Link's context: this is the pending flag of this tab's
  // own route, not a guess about it.
  const { pending } = useLinkStatus();
  const Icon = tab.Icon;
  const breathing = pending && !current;
  const drawer = variant === "drawer";
  const bottom = variant === "bottom";

  return (
    <>
      <span className={styles.navIconWrap}>
        <Icon
          className={[
            bottom
              ? styles.tabBarIcon
              : drawer
                ? styles.drawerIcon
                : styles.navIcon,
            breathing ? styles.tabIconLoading : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />

        {/* A count on the glyph, the way every inbox does it: the number
            belongs to the destination, not to the page behind it. */}
        {badge > 0 ? (
          <span className={styles.navBadge} aria-hidden="true">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>

      {drawer ? (
        <>
          <span>{tab.label}</span>
          <span className={styles.drawerNumeral} aria-hidden="true">
            {badge > 0 ? badge : String((index ?? 0) + 1).padStart(2, "0")}
          </span>
        </>
      ) : (
        <span className={bottom ? styles.tabBarLabel : styles.navLabel}>
          {bottom ? tab.short : tab.label}
        </span>
      )}
    </>
  );
}

function TabLink({
  tab,
  current,
  onPending,
  onNavigate,
  index,
  badge = 0,
  variant = "nav",
}: {
  tab: Tab;
  current: boolean;
  onPending: (href: string) => void;
  onNavigate?: () => void;
  /** Set only in the drawer, where each row carries its number. */
  index?: number;
  badge?: number;
  variant?: "nav" | "drawer" | "bottom";
}) {
  function onClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    onNavigate?.();

    // A modifier or middle click opens the route somewhere else and never
    // changes this page, so the content area must not move for it.
    const elsewhere =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    // The tab you are standing on has nothing left to load.
    if (!elsewhere && !current) onPending(tab.href);
  }

  const linkClass =
    variant === "drawer"
      ? styles.drawerLink
      : variant === "bottom"
        ? styles.tabBarLink
        : styles.navItem;

  const activeClass =
    variant === "drawer"
      ? styles.drawerLinkActive
      : variant === "bottom"
        ? styles.tabBarLinkActive
        : styles.navItemActive;

  return (
    <Link
      href={tab.href}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={[linkClass, current ? activeClass : ""].filter(Boolean).join(" ")}
    >
      <TabFace tab={tab} variant={variant} current={current} index={index} badge={badge} />
    </Link>
  );
}

/** The wordmark, going to the workspace rather than the marketing site. */
function BrandLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <PendingLink
      href="/seeker"
      className={styles.brand}
      aria-label="Recruit AI — your workspace"
      pending={<ButtonSpinner />}
      onClick={onNavigate}
    >
      <span className={styles.brandRoman}>Recruit</span>
      <span className={styles.brandAI}>AI</span>
      <sup className={styles.brandTm}>TM</sup>
    </PendingLink>
  );
}

// ------------------------------------------------------------------
//  Drawer
// ------------------------------------------------------------------
function Drawer({
  open,
  viewer,
  pathname,
  leaving,
  badges,
  onClose,
  onSignOut,
  onPending,
}: {
  open: boolean;
  viewer: Viewer;
  pathname: string;
  leaving: boolean;
  badges: SocialBadges;
  onClose: () => void;
  onSignOut: () => void;
  onPending: (href: string) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Lock the page behind the drawer, move focus into it, keep Tab inside it
  // and give focus back on the way out.
  useEffect(() => {
    if (!open) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.drawerLayer}>
      <button
        type="button"
        className={styles.drawerBackdrop}
        aria-label="Close navigation"
        onClick={onClose}
      />

      <div
        ref={panel}
        className={styles.drawer}
        id="seeker-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation"
      >
        <div className={styles.drawerHead}>
          <BrandLink onNavigate={onClose} />
          <button
            ref={closeButton}
            type="button"
            className={styles.drawerClose}
            aria-label="Close navigation"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <nav className={styles.drawerNav} aria-label="Job seeker">
          {TABS.map((tab, index) => (
            <TabLink
              key={tab.href}
              tab={tab}
              variant="drawer"
              index={index}
              badge={tab.badge ? badges[tab.badge] : 0}
              current={isCurrent(pathname, tab)}
              onPending={onPending}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className={styles.drawerPerson}>
          <PersonAvatar person={viewer} src={viewer.photo} large />
          <div className={styles.dropdownIdentity}>
            <strong className={styles.dropdownName}>
              {`${viewer.firstName} ${viewer.lastName}`.trim() || "Your account"}
            </strong>
            <span className={styles.dropdownMail}>{viewer.email}</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.drawerSignOut}
          onClick={onSignOut}
          disabled={leaving}
        >
          {leaving ? "Signing out…" : "Sign out"}
        </button>

        <div className={styles.drawerFoot}>
          <PendingLink href="/privacy" onClick={onClose} pending={<ButtonSpinner />}>
            Privacy
          </PendingLink>
          <PendingLink href="/terms" onClick={onClose} pending={<ButtonSpinner />}>
            Terms
          </PendingLink>
          <a href="mailto:hello@recruitailabs.in">Help</a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------
//  Shell
// ------------------------------------------------------------------
export default function SeekerShell({
  viewer,
  badges: initialBadges,
  children,
}: {
  viewer: Viewer;
  badges?: SocialBadges;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const [badges, setBadges] = useState<SocialBadges>(initialBadges ?? emptyBadges());

  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // The destination whose route is in flight, and when its skeleton took
  // the floor. `settled` says the route behind it has since committed.
  const [loading, setLoading] = useState<{ href: string; at: number } | null>(
    null,
  );
  const [settled, setSettled] = useState(true);

  const meRef = useRef<HTMLDivElement>(null);
  const meButton = useRef<HTMLButtonElement>(null);

  // A new page means the menu and the drawer have done their job, and that
  // whatever was loading has arrived.
  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
    setSettled(true);
  }, [pathname]);

  // The three numbers on the bar. They are polled rather than pushed: a
  // message that arrives while the reader is on the feed should light the
  // bubble within half a minute, without a socket for three counters. A
  // navigation asks at once, because arriving on the bell should clear it.
  useEffect(() => {
    let alive = true;

    async function refresh() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch("/api/social/badges", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as Partial<SocialBadges>;
        if (!alive) return;

        setBadges({
          messages: Number(data.messages ?? 0),
          notifications: Number(data.notifications ?? 0),
          invitations: Number(data.invitations ?? 0),
        });
      } catch {
        // A count that cannot be read keeps its last value; the bar is not
        // the place to report a database problem.
      }
    }

    void refresh();

    const timer = window.setInterval(() => void refresh(), 30_000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [pathname]);

  // Called from a destination on the frame it is clicked, so the skeleton is
  // already being drawn by the time the click has finished.
  const notePending = useCallback((href: string) => {
    setSettled(false);
    setLoading({ href, at: Date.now() });
  }, []);

  // The skeleton is held a beat past the commit. A prefetched route can
  // arrive faster than an eye registers, and a skeleton that survives a
  // single frame reads as a glitch rather than as feedback.
  useEffect(() => {
    if (!loading || !settled) return;

    const hold = Math.max(0, SKELETON_MIN_MS - (Date.now() - loading.at));
    const timer = setTimeout(() => setLoading(null), hold);

    return () => clearTimeout(timer);
  }, [loading, settled]);

  // A navigation that never commits — a failed read, a request that gives
  // up — must not leave the skeleton standing in place of the page.
  useEffect(() => {
    if (!loading) return;

    const timer = setTimeout(() => setLoading(null), SKELETON_FAILSAFE_MS);

    return () => clearTimeout(timer);
  }, [loading]);

  // A click anywhere else closes the menu; Escape closes it and returns the
  // focus to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!meRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      meButton.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // The mobile bar's centre button. On the feed it opens the composer in
  // place (the feed listens for this event); anywhere else it is a plain
  // navigation to `/seeker?compose=1`, which the feed reads on arrival.
  function onCompose(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (pathname === "/seeker") {
      event.preventDefault();
      window.dispatchEvent(new Event("seeker:compose"));
    } else {
      notePending("/seeker");
    }
  }

  async function leave() {
    if (leaving) return;

    setLeaving(true);
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      // A failed sign-out is not worth a modal: the button becomes usable
      // again and the session is still there to try from.
      setLeaving(false);
    }
  }

  const displayName = `${viewer.firstName} ${viewer.lastName}`.trim();

  return (
    <div className={styles.root}>
      <a className={styles.skip} href="#seeker-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandLink />
          <span className={styles.workspaceLabel}>Job seeker</span>

          <nav className={styles.nav} aria-label="Job seeker">
            {TABS.map((tab) => (
              <TabLink
                key={tab.href}
                tab={tab}
                badge={tab.badge ? badges[tab.badge] : 0}
                current={isCurrent(pathname, tab)}
                onPending={notePending}
              />
            ))}
          </nav>

          <div className={styles.me} ref={meRef}>
            <button
              ref={meButton}
              type="button"
              className={styles.meButton}
              aria-expanded={menuOpen}
              aria-controls="seeker-account-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <PersonAvatar person={viewer} src={viewer.photo} />
              <span className={styles.meLabel}>
                Me
                <span className={styles.chevron} aria-hidden="true">
                  ▾
                </span>
              </span>
            </button>

            {menuOpen ? (
              <div
                className={styles.dropdown}
                id="seeker-account-menu"
                aria-label="Your account"
              >
                <div className={styles.dropdownPerson}>
                  <PersonAvatar person={viewer} src={viewer.photo} large />
                  <div className={styles.dropdownIdentity}>
                    <strong className={styles.dropdownName}>
                      {displayName || "Your account"}
                    </strong>
                    <span className={styles.dropdownMail}>{viewer.email}</span>
                  </div>
                </div>

                <PendingLink
                  href="/seeker/profile"
                  className={styles.menuItem}
                  pending={<ButtonSpinner />}
                >
                  View profile
                  <span className={styles.menuValue} aria-hidden="true">
                    ↗
                  </span>
                </PendingLink>

                <PendingLink
                  href="/seeker/settings"
                  className={styles.menuItem}
                  pending={<ButtonSpinner />}
                >
                  Settings &amp; privacy
                </PendingLink>

                <button
                  type="button"
                  className={styles.menuSignOut}
                  onClick={leave}
                  disabled={leaving}
                >
                  {leaving ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.mobileToggle}
            aria-label="Open navigation"
            aria-controls="seeker-navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span className={styles.bars} aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>

      <main
        id="seeker-content"
        className={styles.main}
        tabIndex={-1}
        aria-busy={loading ? true : undefined}
      >
        {/* The page that was here steps out of the way rather than sitting
            behind the skeleton. It stays mounted, so coming back to it costs
            nothing: only its paint is withheld. */}
        <div
          className={styles.pageSlot}
          data-loading={loading ? "true" : undefined}
        >
          {children}
        </div>

        {loading ? (
          loading.href === "/seeker" ? <FeedSkeleton /> : <SeekerSkeleton />
        ) : null}
      </main>

      {/* The one-handed bar. It is hidden from the waist up (see the media
          rule in the stylesheet) where the top nav already carries every
          destination; on a phone it is the whole navigation, and the drawer
          is where the two less-used destinations still live. */}
      <nav className={styles.tabBar} aria-label="Job seeker">
        {BOTTOM_LEFT.map((href) => {
          const tab = TABS.find((entry) => entry.href === href);
          if (!tab) return null;
          return (
            <TabLink
              key={href}
              tab={tab}
              variant="bottom"
              badge={tab.badge ? badges[tab.badge] : 0}
              current={isCurrent(pathname, tab)}
              onPending={notePending}
            />
          );
        })}

        <Link
          href="/seeker?compose=1"
          className={styles.tabBarPost}
          aria-label="Start a post"
          onClick={onCompose}
        >
          <PlusIcon className={styles.tabBarPostIcon} />
        </Link>

        {BOTTOM_RIGHT.map((href) => {
          const tab = TABS.find((entry) => entry.href === href);
          if (!tab) return null;
          return (
            <TabLink
              key={href}
              tab={tab}
              variant="bottom"
              badge={tab.badge ? badges[tab.badge] : 0}
              current={isCurrent(pathname, tab)}
              onPending={notePending}
            />
          );
        })}
      </nav>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© {new Date().getFullYear()} Recruit AI Labs</span>
          <div className={styles.footerLinks}>
            <PendingLink href="/privacy" pending={<ButtonSpinner />}>
              Privacy
            </PendingLink>
            <PendingLink href="/terms" pending={<ButtonSpinner />}>
              Terms
            </PendingLink>
            <PendingLink href="/data-rights" pending={<ButtonSpinner />}>
              Data rights
            </PendingLink>
            <a href="mailto:hello@recruitailabs.in">Help</a>
          </div>
        </div>
      </footer>

      <Drawer
        open={drawerOpen}
        viewer={viewer}
        pathname={pathname}
        leaving={leaving}
        badges={badges}
        onClose={closeDrawer}
        onSignOut={leave}
        onPending={notePending}
      />
    </div>
  );
}
