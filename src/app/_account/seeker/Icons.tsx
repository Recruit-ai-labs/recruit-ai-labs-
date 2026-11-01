// ------------------------------------------------------------------
//  Icons.
//
//  The workspace draws its own glyphs rather than pulling an icon package:
//  six 24px outlines, stroked with currentColor so a destination can be
//  muted, ink or active without a second asset. Each one is decorative —
//  the label beside it is the accessible name.
// ------------------------------------------------------------------

type IconProps = { className?: string };

function Frame({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** House — the home destination. */
export function HomeIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
    </Frame>
  );
}

/** Head and shoulders — the profile destination. */
export function UserIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.6 20a7.4 7.4 0 0 1 14.8 0" />
    </Frame>
  );
}

/** Three sliders — the settings destination. */
export function SlidersIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M4 7h7M15 7h5M4 17h4M12 17h8" />
      <circle cx="13" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Frame>
  );
}

/** Two cards — a feed, used as the empty state's mark. */
export function PostsIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <rect x="3.5" y="5" width="17" height="6" rx="1.6" />
      <rect x="3.5" y="14" width="11" height="5" rx="1.6" />
    </Frame>
  );
}

/** A plus — the compose action raised out of the mobile bar's centre. */
export function PlusIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Frame>
  );
}

/** A pencil in a square — posting, and editing later. */
export function PencilIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z" />
      <path d="M13.5 7 17 10.5" />
    </Frame>
  );
}

/** A shield — private information. */
export function ShieldIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6z" />
      <path d="M9.2 12.2 11.3 14l3.6-3.8" />
    </Frame>
  );
}

// ------------------------------------------------------------------
//  The feed's own glyphs. They belong to the same family as the six
//  above — 24px outline, currentColor — because a post card sits inside
//  the workspace and must not look borrowed from another product.
// ------------------------------------------------------------------

/** A thumb — the like action, filled by the caller when it is active. */
export function LikeIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M7 10.5h2.6V20H7a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1z" />
      <path d="M9.6 10.5 13.4 4a2 2 0 0 1 1.9 2.4l-.7 3h4.1a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.7H9.6z" />
    </Frame>
  );
}

// The four reactions that join the thumb in the picker. They are drawn in
// the same 24px outline family rather than as coloured emoji: the workspace
// is monochrome by decision, and a heart that arrives as an emoji would be
// the only thing on the page somebody else's font has to render.

/** A popped cracker — celebrating someone's win. */
export function CelebrateIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M13.4 20 4 10.6l6.4-6.6L13.4 20z" />
      <path d="M17 8.6 18.6 7" />
      <path d="M19.4 12.6h2.2" />
      <path d="M17 16.6l1.6 1.6" />
      <path d="M14.6 6.4 15.8 4" />
    </Frame>
  );
}

/** A raised fist — standing with the person or the cause. */
export function SupportIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M8 20v-3.8L5.8 14a1.7 1.7 0 0 1 2.5-2.3l1 1V6.6a1.5 1.5 0 0 1 3 0V10h.5V5.4a1.5 1.5 0 0 1 3 0V10h.5V6.8a1.5 1.5 0 0 1 3 0v6.4c0 3-2.2 6.8-5.4 6.8H8z" />
    </Frame>
  );
}

/** A light bulb — a post worth an insight. */
export function InsightIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M9.4 15.6a6 6 0 1 1 5.2 0V18a1.4 1.4 0 0 1-1.4 1.4h-2.4A1.4 1.4 0 0 1 9.4 18z" />
      <path d="M10 21.4h4" />
    </Frame>
  );
}

/** A heart — loving a post. */
export function LoveIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M12 20S4.6 15.4 4.6 10.2A3.8 3.8 0 0 1 12 8.4a3.8 3.8 0 0 1 7.4 1.8C19.4 15.4 12 20 12 20z" />
    </Frame>
  );
}

/** A speech bubble — the comment action. */
export function CommentIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M20 12.4c0 3.6-3.6 6.4-8 6.4a9.6 9.6 0 0 1-2.5-.3L5 20l1-3.3A6.1 6.1 0 0 1 4 12.4C4 8.8 7.6 6 12 6s8 2.8 8 6.4z" />
    </Frame>
  );
}

/** Two arrows chasing each other — the repost action. */
export function RepostIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M4 8.5h11.5a3 3 0 0 1 3 3V13" />
      <path d="m16 5.5 2.5 3L16 11.5" />
      <path d="M20 15.5H8.5a3 3 0 0 1-3-3V11" />
      <path d="m8 18.5-2.5-3L8 12.5" />
    </Frame>
  );
}

/** A paper plane — sending a post on. */
export function SendIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M20.5 3.8 3.6 10.4l6.3 2.5 2.4 6.3z" />
      <path d="m9.9 12.9 10.6-9.1" />
    </Frame>
  );
}

/** A ribbon — saved posts. */
export function BookmarkIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-4.4L5.5 20V5.5a1 1 0 0 1 1-1z" />
    </Frame>
  );
}

/** A framed picture — attaching a photo. */
export function ImageIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.8" cy="10" r="1.6" />
      <path d="m4.5 17 4.6-4.3 3.4 3.2 3-2.6 4 3.7" />
    </Frame>
  );
}

/** A frame with a play mark — attaching a short clip. */
export function VideoIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m10.4 9.2 4.4 2.8-4.4 2.8z" />
    </Frame>
  );
}

/** A globe — a post anyone can see. */
export function GlobeIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M3.8 12h16.4" />
      <path d="M12 3.8c2.2 2.3 3.3 5 3.3 8.2s-1.1 5.9-3.3 8.2c-2.2-2.3-3.3-5-3.3-8.2S9.8 6.1 12 3.8z" />
    </Frame>
  );
}

/** Two heads — a post only followers can see, and the follow rail. */
export function UsersIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="9.2" cy="8.6" r="3.4" />
      <path d="M2.9 19a6.4 6.4 0 0 1 12.6 0" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6" />
      <path d="M17.4 13.6a5.6 5.6 0 0 1 3.7 5.4" />
    </Frame>
  );
}

/** A question mark in a circle — the composer's prompt action. */
export function QuestionIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M9.7 9.6a2.4 2.4 0 1 1 3.2 2.3c-.6.3-.9.8-.9 1.5v.3" />
      <path d="M12 16.6h.01" />
    </Frame>
  );
}

/** A small flag — celebrating a win. */
export function FlagIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M6 21V4.5" />
      <path d="M6 4.5h11l-1.8 3.6L17 11.7H6" />
    </Frame>
  );
}

/** Three dots — the post menu. */
export function MoreIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="6" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </Frame>
  );
}

/** A diagonal cross — closing a sheet. */
export function CloseIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Frame>
  );
}

/** Two chain links — copying a permalink. */
export function LinkIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M10.4 13.6a4 4 0 0 0 5.7 0l2.4-2.4a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M13.6 10.4a4 4 0 0 0-5.7 0l-2.4 2.4a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </Frame>
  );
}

/** A bin — deleting your own post or comment. */
export function TrashIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M4.8 7h14.4" />
      <path d="M9.6 7V5.2a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.6 7l.8 11.4a1.6 1.6 0 0 0 1.6 1.5h5.9a1.6 1.6 0 0 0 1.6-1.5L17.4 7" />
    </Frame>
  );
}

/** A tick — a copied link, a finished action. */
export function CheckIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="m5 12.6 4.4 4.4L19 6.8" />
    </Frame>
  );
}

// ------------------------------------------------------------------
//  The social layer's glyphs — the bar's new destinations and the
//  profile's lock. Same family, same weight, so a bell in the bar and a
//  ribbon on a post read as one hand.
// ------------------------------------------------------------------

/** Three heads — the network destination. */
export function NetworkIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M6.2 19.2a5.8 5.8 0 0 1 11.6 0" />
      <circle cx="5.4" cy="10.4" r="2.2" />
      <path d="M2 18.2a3.6 3.6 0 0 1 3.2-3.3" />
      <circle cx="18.6" cy="10.4" r="2.2" />
      <path d="M22 18.2a3.6 3.6 0 0 0-3.2-3.3" />
    </Frame>
  );
}

/** A bell — the notifications destination. */
export function BellIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M18 15.4V11a6 6 0 1 0-12 0v4.4L4.6 18h14.8z" />
      <path d="M9.8 20.4a2.4 2.4 0 0 0 4.4 0" />
    </Frame>
  );
}

/** A padlock — the profile detail behind connect or follow. */
export function LockIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <rect x="5" y="10.4" width="14" height="9.6" rx="2" />
      <path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4" />
      <path d="M12 14.2v2.2" />
    </Frame>
  );
}

/** A briefcase — one row of experience. */
export function BriefcaseIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <rect x="3.4" y="7.4" width="17.2" height="11.6" rx="2" />
      <path d="M9 7.4V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.6" />
      <path d="M3.4 12.6h17.2" />
    </Frame>
  );
}

/** A graduation cap — one row of education. */
export function GraduationIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M2.8 9.4 12 5l9.2 4.4L12 13.8z" />
      <path d="M6.4 11.4v4.2c0 1.4 2.5 2.6 5.6 2.6s5.6-1.2 5.6-2.6v-4.2" />
    </Frame>
  );
}

/** A pin — where a person works from. */
export function PinIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M12 21s6.4-5.8 6.4-10.4A6.4 6.4 0 0 0 5.6 10.6C5.6 15.2 12 21 12 21z" />
      <circle cx="12" cy="10.4" r="2.4" />
    </Frame>
  );
}

/** A magnifier — searching people and messages. */
export function SearchIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="10.8" cy="10.8" r="6.2" />
      <path d="m15.4 15.4 4.2 4.2" />
    </Frame>
  );
}

/** An eye — who has looked at your profile. */
export function EyeIcon({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M2.8 12S6.4 6.2 12 6.2 21.2 12 21.2 12 17.6 17.8 12 17.8 2.8 12 2.8 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </Frame>
  );
}
