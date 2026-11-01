"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import { put as putToBlob } from "@vercel/blob/client";

import {
  MAX_IMAGE_LENGTH,
  MAX_POST_BODY,
  MAX_VIDEO_BYTES,
  VIDEO_ACCEPT,
  VIDEO_TYPES,
  fullName,
  type Audience,
  type FeedPost,
  type FeedViewer,
} from "@/lib/feed-types";
import type { PersonCard } from "@/lib/social-types";
import { shrinkImage } from "@/lib/shrink-image";

import {
  CloseIcon,
  FlagIcon,
  GlobeIcon,
  ImageIcon,
  PencilIcon,
  QuestionIcon,
  UsersIcon,
  VideoIcon,
} from "./Icons";
import PersonAvatar from "./PersonAvatar";
import styles from "./seeker.module.scss";
import useOverlay from "./useOverlay";

// ------------------------------------------------------------------
//  The composer.
//
//  A quiet row on the page that opens into one sheet: who sees it, the
//  words, an optional photo, and a counter that turns before the limit
//  rather than after it. Three things make it feel finished instead of
//  merely present:
//
//  · the photo is shrunk in the browser (1600px, JPEG) before it is sent,
//    so a phone camera does not become a 6MB request;
//  · the draft survives a closed tab — the same courtesy LinkedIn gives,
//    and the one thing people notice only when it is missing;
//  · Ctrl/⌘ + Enter publishes, so the flow never needs the mouse after
//    the first click.
// ------------------------------------------------------------------

type Prompt = "photo" | "video" | "question" | "win";

type Props = {
  viewer: FeedViewer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: (post: FeedPost) => void;
};

const QUICK = [
  { key: "photo" as const, label: "Photo", Icon: ImageIcon },
  { key: "video" as const, label: "Video", Icon: VideoIcon },
  { key: "question" as const, label: "Ask the room", Icon: QuestionIcon },
  { key: "win" as const, label: "Share a win", Icon: FlagIcon },
];

const TEMPLATE: Record<"question" | "win", string> = {
  question: "A question for the room —\n\n",
  win: "Something worth marking this week:\n\n",
};

const draftKey = (id: string) => `recruitai:composer:${id}`;

/**
 * The `@` being typed, if one is. `start` is the index of the at-sign, so
 * the pick can replace it and the half-typed name in one step. A bare `@`
 * counts too, with an empty query: the server answers that with the people
 * the reader most often talks to, so the list is up before a letter is hit.
 */
type Mention = { start: number; query: string };

function mentionAt(value: string, caret: number): Mention | null {
  const before = value.slice(0, caret);
  const match = before.match(/(^|[\s([{])@([a-z][a-z0-9_]{0,29})?$/i);

  if (!match) return null;

  const query = match[2] ?? "";
  return { start: caret - query.length - 1, query };
}

function readDraft(id: string) {
  try {
    return localStorage.getItem(draftKey(id)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(id: string, text: string) {
  try {
    if (!text.trim()) localStorage.removeItem(draftKey(id));
    else localStorage.setItem(draftKey(id), text);
  } catch {
    // A private window with storage disabled is not a reason to lose the
    // composer; the draft just does not survive the tab.
  }
}

/**
 * Re-encode a chosen photo to a data URL small enough to travel in a JSON
 * body. Shared with the profile's two pictures — the same rules, two
 * budgets: an attachment can be wider than a portrait needs to be.
 */
function shrink(file: File) {
  return shrinkImage(file, {
    maxEdge: 1600,
    maxLength: MAX_IMAGE_LENGTH - 20_000,
  });
}

/**
 * Grab one frame out of a chosen clip to stand as its poster. The bytes go
 * straight to Blob and never come back to us, so the still has to be drawn
 * in the browser: a muted off-DOM video seeks just past the opener (a black
 * first frame makes a dull card), the frame is painted to a canvas, and a
 * small JPEG is handed to the same image path a photo already uses.
 */
async function posterFor(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");

  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("no frame"));
    });

    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (!width || !height) return null;

    // Nudge past the opener, but give up after a beat if the codec stalls.
    const target = Math.min(0.5, (video.duration || 1) * 0.1);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = target;
      window.setTimeout(resolve, 800);
    });

    const scale = Math.min(1, 720 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

export default function Composer({ viewer, open, onOpenChange, onPosted }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [audience, setAudience] = useState<Audience>("anyone");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [dragging, setDragging] = useState(false);

  // The mention picker: who is being typed, the people the server found
  // for that half-word, and which of them the arrow keys are on.
  const [mention, setMention] = useState<Mention | null>(null);
  const [people, setPeople] = useState<PersonCard[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDone, setMentionDone] = useState(false);

  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const videoPicker = useRef<HTMLInputElement>(null);
  // Null, not "": an empty query is a real query ("show me the usual
  // people"), and a fresh open must fetch it rather than call it a repeat.
  const lastQuery = useRef<string | null>(null);

  const name = fullName(viewer);
  const over = text.length > MAX_POST_BODY - 180;
  const canPost = Boolean(text.trim() || image || video) && !busy && !preparing;

  const close = useCallback(() => {
    if (busy) return;

    setMention(null);
    setPeople([]);
    writeDraft(viewer.id, text);
    onOpenChange(false);
  }, [busy, onOpenChange, text, viewer.id]);

  useOverlay(open, close);

  // The textarea grows with the writing and stops at the sheet's height.
  useEffect(() => {
    const element = area.current;
    if (!element || !open) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 360)}px`;
  }, [text, open]);

  /**
   * Type-ahead over `/api/people`. Debounced by 180ms so a fast typist
   * makes one request for a name rather than one per letter; a half-word
   * that has not moved since is the only thing worth asking about.
   */
  useEffect(() => {
    if (!mention) {
      setPeople([]);
      lastQuery.current = null;
      return;
    }

    const query = mention.query;

    const timer = window.setTimeout(() => {
      if (lastQuery.current === query) return;
      lastQuery.current = query;

      fetch(`/api/people?q=${encodeURIComponent(query)}&limit=6`, { cache: "no-store" })
        .then((response) =>
          response.ok
            ? (response.json() as Promise<{ people?: PersonCard[] }>)
            : { people: [] },
        )
        .then((data) => {
          setPeople((data.people ?? []).filter((person) => person.username));
          setMentionIndex(0);
        })
        .catch(() => setPeople([]));
    }, 180);

    return () => window.clearTimeout(timer);
  }, [mention]);

  /** Replace `@half-word` with `@username ` and keep the caret after it. */
  function pick(person: PersonCard) {
    if (!mention) return;

    const caret = area.current?.selectionStart ?? mention.start + mention.query.length + 1;
    const insert = `@${person.username} `;
    const next = text.slice(0, mention.start) + insert + text.slice(caret);
    const at = mention.start + insert.length;

    setText(next);
    setMention(null);
    setMentionDone(true);
    setPeople([]);

    window.requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(at, at);
    });
  }

  function start(prompt?: Prompt) {
    const draft = text.trim() ? text : readDraft(viewer.id);
    let next = draft;

    if (!next && (prompt === "question" || prompt === "win")) next = TEMPLATE[prompt];

    if (!text.trim() && draft) setRestored(true);
    if (next !== text) setText(next);
    setError("");
    setMention(null);
    setMentionDone(false);

    onOpenChange(true);

    // The pickers live beside the trigger row, not inside the sheet, so
    // opening one after the sheet has painted is the reliable order.
    if (prompt === "photo") window.setTimeout(() => picker.current?.click(), 80);
    if (prompt === "video") window.setTimeout(() => videoPicker.current?.click(), 80);
  }

  async function attach(file: File | undefined) {
    if (!file) return;

    setPreparing(true);
    setError("");

    try {
      setImage(await shrink(file));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That photo could not be attached.");
    } finally {
      setPreparing(false);
      if (picker.current) picker.current.value = "";
    }
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    void attach(event.target.files?.[0]);
  }

  /**
   * Stream a chosen clip straight to Blob, then keep only its public URL.
   * The poster is grabbed first, while the file is still local; the clip
   * never touches our server, so a large upload is bounded only by the
   * token's size budget, not a request body.
   */
  async function attachVideo(file: File | undefined) {
    if (!file) return;

    if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) {
      setError("Choose a video file — MP4 or WebM, not that one.");
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setError(`That clip is over ${Math.round(MAX_VIDEO_BYTES / 1_000_000)} MB. Trim it first.`);
      return;
    }

    setError("");
    setPreparing(true);
    setUploadPct(0);

    try {
      const poster = await posterFor(file);
      if (poster) setImage(poster);

      const ext = file.type === "video/webm" ? "webm" : "mp4";
      const response = await fetch("/api/uploads/video-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext }),
      });

      const issued = (await response.json().catch(() => ({}))) as {
        token?: string;
        pathname?: string;
        error?: string;
      };

      if (!response.ok || !issued.token || !issued.pathname) {
        throw new Error(issued.error ?? "That video could not be uploaded.");
      }

      const blob = await putToBlob(issued.pathname, file, {
        token: issued.token,
        access: "public",
        multipart: file.size > 8_000_000,
        onUploadProgress: (event) => setUploadPct(event.percentage),
      });

      setVideo(blob.url);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That video could not be uploaded.");
    } finally {
      setPreparing(false);
      setUploadPct(null);
      if (videoPicker.current) videoPicker.current.value = "";
    }
  }

  function onVideoFile(event: ChangeEvent<HTMLInputElement>) {
    void attachVideo(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void attach(event.dataTransfer.files?.[0]);
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = [...event.clipboardData.files][0];
    if (!file) return;

    event.preventDefault();
    void attach(file);
  }

  async function publish() {
    if (!canPost) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim(), image, video, audience }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        post?: FeedPost;
        error?: string;
      };

      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "That post could not be published.");
      }

      writeDraft(viewer.id, "");
      setText("");
      setImage(null);
      setVideo(null);
      setUploadPct(null);
      setRestored(false);
      setAudience("anyone");
      setMention(null);
      setMentionDone(false);
      setPeople([]);
      onPosted(data.post);
      onOpenChange(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That post could not be published.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className={styles.composer} aria-label="Create a post">
        <div className={styles.composerRow}>
          <PersonAvatar person={viewer} src={viewer.photo} large />

          <button
            type="button"
            className={styles.composerPrompt}
            onClick={() => start()}
          >
            <span className={styles.composerPromptBody}>
              <span className={styles.composerPromptText}>
                {name
                  ? `${name.split(" ")[0]}, what are you building, learning or stuck on?`
                  : "What are you building, learning or stuck on?"}
              </span>
            </span>

            {/* Decoration, not a second control: the whole field is the
                button, so the pencil only says what a click will do. */}
            <span className={styles.composerPromptGo} aria-hidden="true">
              <PencilIcon className={styles.composerPromptIcon} />
            </span>
          </button>
        </div>

        <div className={styles.composerQuick}>
          {QUICK.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={styles.quickAction}
              onClick={() => start(key)}
            >
              <span className={styles.quickTile} aria-hidden="true">
                <Icon className={styles.quickIcon} />
              </span>
              <span className={styles.quickLabel}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <input
        ref={picker}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.srOnly}
        onChange={onFile}
        tabIndex={-1}
        aria-hidden="true"
      />

      <input
        ref={videoPicker}
        type="file"
        accept={VIDEO_ACCEPT}
        className={styles.srOnly}
        onChange={onVideoFile}
        tabIndex={-1}
        aria-hidden="true"
      />

      {open
        ? createPortal(
            <div className={styles.overlay}>
              <button
                type="button"
                className={styles.backdrop}
                aria-label="Close the composer"
                onClick={close}
              />

              <div
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="composer-title"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                data-dragging={dragging || undefined}
              >
                <header className={styles.sheetHead}>
                  <div>
                    <h2 className={styles.sheetTitle} id="composer-title">
                      Create a post
                    </h2>
                    <p className={styles.sheetSub}>
                      Posts stay in your workspace. Followers-only is seen by
                      people who follow you.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.sheetClose}
                    aria-label="Close the composer"
                    onClick={close}
                  >
                    <CloseIcon className={styles.sheetCloseIcon} />
                  </button>
                </header>

                <div className={styles.sheetPerson}>
                  <PersonAvatar person={viewer} src={viewer.photo} large />
                  <div className={styles.sheetIdentity}>
                    <strong className={styles.sheetName}>{name || "Your post"}</strong>
                    <span className={styles.sheetSubline}>
                      {viewer.headline || `@${viewer.username}`}
                    </span>

                    <span className={styles.audienceChip}>
                      {audience === "anyone" ? (
                        <GlobeIcon className={styles.audienceIcon} />
                      ) : (
                        <UsersIcon className={styles.audienceIcon} />
                      )}
                      <select
                        className={styles.audienceSelect}
                        value={audience}
                        aria-label="Who can see this post"
                        onChange={(event) => setAudience(event.target.value as Audience)}
                      >
                        <option value="anyone">Anyone in the workspace</option>
                        <option value="followers">Followers only</option>
                      </select>
                    </span>
                  </div>
                </div>

                <textarea
                  ref={area}
                  className={styles.sheetText}
                  value={text}
                  rows={5}
                  maxLength={MAX_POST_BODY}
                  autoFocus
                  placeholder="What do you want to talk about?"
                  aria-label="Post text"
                  onChange={(event) => {
                    const value = event.target.value;
                    setText(value);
                    if (error) setError("");

                    // The caret, not the end of the text: a reader who
                    // clicks back into a word is typing there.
                    const caret = event.target.selectionStart ?? value.length;
                    setMention(mentionAt(value, caret));
                    if (!mentionAt(value, caret)) setPeople([]);
                  }}
                  onPaste={onPaste}
                  onKeyDown={(event) => {
                    // The picker owns four keys while it is open: the
                    // arrows move, Enter and Tab take the name, Escape
                    // puts it away. Ctrl/⌘ + Enter still posts.
                    if (mention && people.length) {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setMentionIndex((index) => (index + 1) % people.length);
                        return;
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setMentionIndex(
                          (index) => (index - 1 + people.length) % people.length,
                        );
                        return;
                      }

                      if (event.key === "Enter" || event.key === "Tab") {
                        if (!(event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          pick(people[mentionIndex]);
                          return;
                        }
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        setMention(null);
                        setPeople([]);
                        return;
                      }
                    }

                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void publish();
                    }
                  }}
                />

                {mention && people.length ? (
                  <div className={styles.mentionPicker} role="listbox" aria-label="Mention someone">
                    <p className={styles.mentionHead}>
                      Mention someone
                      <span aria-hidden="true">↑↓ then Enter</span>
                    </p>

                    <ul className={styles.mentionList}>
                      {people.map((person, index) => (
                        <li key={person.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={index === mentionIndex}
                            className={
                              index === mentionIndex
                                ? `${styles.mentionOption} ${styles.mentionOptionActive}`
                                : styles.mentionOption
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pick(person)}
                            onMouseEnter={() => setMentionIndex(index)}
                          >
                            <PersonAvatar person={{ firstName: "", lastName: "", name: person.name }} src={person.photo} />
                            <span className={styles.mentionBody}>
                              <strong>{person.name}</strong>
                              <span>@{person.username}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {video ? (
                  <figure className={styles.sheetMedia}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      className={styles.sheetMediaImg}
                      src={video}
                      poster={image ?? undefined}
                      controls
                      playsInline
                      muted
                    />
                    <button
                      type="button"
                      className={styles.sheetMediaRemove}
                      onClick={() => {
                        setVideo(null);
                        setImage(null);
                      }}
                      disabled={busy}
                    >
                      Remove video
                    </button>
                  </figure>
                ) : image ? (
                  <figure className={styles.sheetMedia}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Attached photo" className={styles.sheetMediaImg} />
                    <button
                      type="button"
                      className={styles.sheetMediaRemove}
                      onClick={() => setImage(null)}
                      disabled={busy}
                    >
                      Remove photo
                    </button>
                  </figure>
                ) : null}

                {restored ? (
                  <p className={styles.draftNote}>
                    Draft restored from your last visit.
                    <button
                      type="button"
                      className={styles.draftDiscard}
                      onClick={() => {
                        writeDraft(viewer.id, "");
                        setText("");
                        setRestored(false);
                      }}
                    >
                      Discard it
                    </button>
                  </p>
                ) : null}

                {error ? (
                  <p className={styles.formError} role="alert">
                    {error}
                  </p>
                ) : null}

                <footer className={styles.sheetFoot}>
                  <div className={styles.sheetTools}>
                    <button
                      type="button"
                      className={styles.toolButton}
                      onClick={() => picker.current?.click()}
                      disabled={preparing || busy}
                      aria-label="Attach a photo"
                      title="Attach a photo"
                    >
                      <ImageIcon className={styles.quickIcon} />
                    </button>

                    <button
                      type="button"
                      className={styles.toolButton}
                      onClick={() => videoPicker.current?.click()}
                      disabled={preparing || busy}
                      aria-label="Attach a video"
                      title="Attach a video"
                    >
                      <VideoIcon className={styles.quickIcon} />
                    </button>

                    <span className={styles.sheetHint}>
                      {preparing
                        ? uploadPct !== null
                          ? `Uploading video… ${Math.round(uploadPct)}%`
                          : "Preparing photo…"
                        : mentionDone
                          ? "Mention added · Ctrl + Enter to post"
                          : ""}
                    </span>
                  </div>

                  <div className={styles.sheetPublish}>
                    <span className={over ? `${styles.counter} ${styles.counterOver}` : styles.counter}>
                      {text.length} / {MAX_POST_BODY}
                    </span>
                    <button
                      type="button"
                      className={styles.publish}
                      onClick={() => void publish()}
                      disabled={!canPost}
                    >
                      {busy ? "Posting…" : "Post"}
                    </button>
                  </div>
                </footer>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
