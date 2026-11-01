"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  plural,
  type FeedFilter,
  type FeedPage,
  type FeedPost,
  type FeedViewer,
} from "@/lib/feed-types";

import Composer from "./Composer";
import { PostsIcon } from "./Icons";
import PostCard from "./PostCard";
import styles from "./seeker.module.scss";

// ------------------------------------------------------------------
//  The live feed.
//
//  The first page arrives server-rendered, so the feed is readable before
//  any JavaScript runs. After that this component keeps it true:
//
//  · every fifteen seconds it asks for the newest page, folds the changed
//    counts back into the cards already on screen, and parks posts it has
//    not seen behind a "N new posts" pill — the same bargain LinkedIn
//    makes, because a list that jumps under a reading thumb is worse than
//    one that waits;
//  · if the reader is already at the top, new posts simply appear;
//  · a hidden tab does not poll, and a tab that comes back polls at once;
//  · scrolling to the bottom of a tab asks for the older page on its own, and
//    the button underneath stays for a keyboard, a broken observer and a
//    reader who would rather say so out loud.
//
//  Every write is optimistic and then reconciled with the server's answer,
//  so the like button never waits for a round trip to look pressed.
// ------------------------------------------------------------------

type List = {
  posts: FeedPost[];
  cursor: number | null;
  /** Posts the poll found while the reader was further down the page. */
  fresh: FeedPost[];
  loaded: boolean;
  loading: boolean;
};

type Props = {
  viewer: FeedViewer;
  initial: FeedPage;
};

const PAGE = 12;
const POLL_MS = 15_000;

const TABS: { key: FeedFilter; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "following", label: "Following" },
  { key: "saved", label: "Saved" },
];

const EMPTY_TITLE: Record<FeedFilter, string> = {
  "for-you": "Your feed is ready.",
  following: "Nothing from the people you follow yet.",
  saved: "Nothing saved yet.",
};

const EMPTY_TEXT: Record<FeedFilter, string> = {
  "for-you":
    "The first post is the only thing missing. Write one, and the feed starts keeping itself current.",
  following:
    "Follow someone from a post or the suggestions rail and their posts — including the ones marked followers-only — land here.",
  saved:
    "Save a post with the bookmark on its card and it waits here for later.",
};

export default function Feed({ viewer, initial }: Props) {
  const [filter, setFilter] = useState<FeedFilter>("for-you");
  const [composerOpen, setComposerOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [lists, setLists] = useState<Record<FeedFilter, List>>(() => ({
    "for-you": {
      posts: initial.posts,
      cursor: initial.cursor,
      fresh: [],
      loaded: true,
      loading: false,
    },
    following: { posts: [], cursor: null, fresh: [], loaded: false, loading: false },
    saved: { posts: [], cursor: null, fresh: [], loaded: false, loading: false },
  }));

  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  // The strip at the end of the list that means "the reader is running out of
  // posts", and the newest `loadMore` kept where the observer can reach it
  // without being rebuilt on every render.
  const sentinel = useRef<HTMLDivElement>(null);
  const askForMore = useRef<() => void>(() => {});

  const list = lists[filter];
  const name = `${viewer.firstName} ${viewer.lastName}`.trim();

  // The live region says one sentence and then stops saying it.
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), 4000);
    return () => window.clearTimeout(timer);
  }, [note]);

  // The mobile bar's centre button, arrived at from another page, lands here
  // as `/seeker?compose=1`. Open the composer once and then restore the tidy
  // URL, so a reload or a shared link does not reopen it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("compose") !== "1") return;

    setComposerOpen(true);
    url.searchParams.delete("compose");
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  // …and when the reader is already on the feed, the same button fires this
  // event instead of navigating, so the composer opens without a scroll jump.
  useEffect(() => {
    function open() {
      setComposerOpen(true);
    }

    window.addEventListener("seeker:compose", open);
    return () => window.removeEventListener("seeker:compose", open);
  }, []);

  const mapLists = useCallback((change: (entry: List) => List) => {
    setLists((prev) => {
      const next = { ...prev };

      for (const key of Object.keys(prev) as FeedFilter[]) {
        next[key] = change(prev[key]);
      }

      return next;
    });
  }, []);

  const applyEverywhere = useCallback(
    (change: (entry: FeedPost) => FeedPost) => {
      mapLists((entry) => ({
        ...entry,
        posts: entry.posts.map(change),
        fresh: entry.fresh.map(change),
      }));
    },
    [mapLists],
  );

  const patch = useCallback(
    (id: string, next: Partial<FeedPost>) => {
      applyEverywhere((entry) => (entry.id === id ? { ...entry, ...next } : entry));
    },
    [applyEverywhere],
  );

  const remove = useCallback(
    (id: string) => {
      mapLists((entry) => ({
        ...entry,
        posts: entry.posts.filter((post) => post.id !== id),
        fresh: entry.fresh.filter((post) => post.id !== id),
      }));
      setNote("Post deleted.");
    },
    [mapLists],
  );

  const prepend = useCallback(
    (post: FeedPost) => {
      mapLists((entry) =>
        entry.loaded
          ? { ...entry, posts: [post, ...entry.posts.filter((each) => each.id !== post.id)] }
          : entry,
      );
    },
    [mapLists],
  );

  const posted = useCallback(
    (post: FeedPost) => {
      prepend(post);
      setFilter("for-you");
      setNote("Your post is live.");
    },
    [prepend],
  );

  const reposted = useCallback(
    (post: FeedPost) => {
      prepend(post);
      setNote("Reposted to your feed.");
    },
    [prepend],
  );

  const follow = useCallback((authorId: string, following: boolean) => {
    applyEverywhere((entry) =>
      entry.author.id === authorId
        ? { ...entry, author: { ...entry.author, following } }
        : entry,
    );
  }, [applyEverywhere]);

  // The live half: one request every fifteen seconds, merged in place.
  useEffect(() => {
    let alive = true;

    async function refresh() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch(`/api/feed?filter=${filter}&limit=${PAGE}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const page = (await response.json()) as FeedPage;
        if (!alive || !Array.isArray(page.posts)) return;

        setLists((prev) => {
          const current = prev[filter];
          const server = new Map(page.posts.map((post) => [post.id, post]));
          const known = new Set(current.posts.map((post) => post.id));
          const fresh = page.posts.filter((post) => !known.has(post.id));

          const posts = current.posts.map((post) => {
            const update = server.get(post.id);

            // A card the newest page no longer holds keeps its own numbers
            // rather than being reset by an absent row.
            if (!update) return post;

            return {
              ...post,
              likes: update.likes,
              comments: update.comments,
              reposts: update.reposts,
              liked: update.liked,
              reaction: update.reaction,
              saved: update.saved,
              edited: update.edited,
              author: { ...post.author, following: update.author.following },
            };
          });

          const atTop = window.scrollY < 160;

          return {
            ...prev,
            [filter]: {
              ...current,
              posts: atTop ? [...fresh, ...posts] : posts,
              fresh: atTop ? current.fresh : [...fresh, ...current.fresh],
            },
          };
        });
      } catch {
        // A poll that fails is not worth a message: the next one asks
        // again and the page on screen is still readable.
      }
    }

    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const wake = () => void refresh();

    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [filter]);

  // A shared link is `/seeker#post-<id>`, and the first page holds only
  // the newest twelve. If the named post is not already on screen it is
  // fetched by id and placed at the top of For you, where the card's own
  // permalink effect then scrolls to it and flashes once. Without this a
  // copied link lands on the top of a list that does not contain the
  // thing it names.
  useEffect(() => {
    let handled = "";

    async function openHash() {
      const hash = window.location.hash;
      if (!hash || hash === handled) return;

      handled = hash;

      const match = hash.match(/^#post-([A-Za-z0-9_-]{1,64})$/);
      if (!match) return;

      const id = match[1];
      const known = Object.values(listsRef.current).some((entry) =>
        [...entry.posts, ...entry.fresh].some((post) => post.id === id),
      );

      if (known) return;

      try {
        const response = await fetch(`/api/posts/${id}`, { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { post?: FeedPost };
        if (!data.post) return;

        setFilter("for-you");
        prepend(data.post);
      } catch {
        // A link that cannot be read leaves the reader at the top of the
        // feed, which is still a page they can use.
      }
    }

    void openHash();
    window.addEventListener("hashchange", openHash);

    return () => window.removeEventListener("hashchange", openHash);
  }, [prepend]);

  async function switchFilter(next: FeedFilter) {
    setFilter(next);
    setError("");

    const cached = listsRef.current[next];
    if (cached.loaded || cached.loading) return;

    setLists((prev) => ({ ...prev, [next]: { ...prev[next], loading: true } }));

    try {
      const response = await fetch(`/api/feed?filter=${next}&limit=${PAGE}`, {
        cache: "no-store",
      });

      const page = (await response.json().catch(() => ({}))) as Partial<FeedPage> & {
        error?: string;
      };

      if (!response.ok) throw new Error(page.error ?? "That feed could not be loaded.");

      setLists((prev) => ({
        ...prev,
        [next]: {
          posts: page.posts ?? [],
          cursor: page.cursor ?? null,
          fresh: [],
          loaded: true,
          loading: false,
        },
      }));
    } catch (problem) {
      setLists((prev) => ({ ...prev, [next]: { ...prev[next], loading: false } }));
      setError(problem instanceof Error ? problem.message : "That feed could not be loaded.");
    }
  }

  async function loadMore() {
    const current = listsRef.current[filter];
    if (!current.cursor || current.loading) return;

    setLists((prev) => ({ ...prev, [filter]: { ...prev[filter], loading: true } }));

    try {
      const response = await fetch(
        `/api/feed?filter=${filter}&limit=${PAGE}&before=${current.cursor}`,
        { cache: "no-store" },
      );

      const page = (await response.json().catch(() => ({}))) as Partial<FeedPage> & {
        error?: string;
      };

      if (!response.ok) throw new Error(page.error ?? "Older posts could not be loaded.");

      setLists((prev) => {
        const shown = prev[filter];
        const known = new Set(shown.posts.map((post) => post.id));

        return {
          ...prev,
          [filter]: {
            ...shown,
            posts: [...shown.posts, ...(page.posts ?? []).filter((post) => !known.has(post.id))],
            cursor: page.cursor ?? null,
            loading: false,
          },
        };
      });
    } catch (problem) {
      setLists((prev) => ({ ...prev, [filter]: { ...prev[filter], loading: false } }));
      setError(problem instanceof Error ? problem.message : "Older posts could not be loaded.");
    }
  }

  // The observer calls the closure of the render it belongs to, so it always
  // asks for the tab the reader is looking at rather than an old one.
  useEffect(() => {
    askForMore.current = () => void loadMore();
  });

  // Older posts arrive when the reader reaches the end, a screen early.
  // Rebuilt whenever the answer changes — a finished cursor, a request in
  // flight, another tab — which is also what makes it look again after a page
  // has landed, so a long thumb scroll never stalls waiting for a tap.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !list.cursor || list.loading) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) askForMore.current();
      },
      // Four hundred pixels of lead: the page is in by the time the button
      // would have scrolled into view, so the wait is never visible.
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [filter, list.cursor, list.loading]);

  function showFresh() {
    setLists((prev) => ({
      ...prev,
      [filter]: {
        ...prev[filter],
        posts: [...prev[filter].fresh, ...prev[filter].posts],
        fresh: [],
      },
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const firstRun = list.loading && !list.posts.length;

  return (
    <div className={styles.feed}>
      <Composer
        viewer={viewer}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={posted}
      />

      <div className={styles.feedHead}>
        <div className={styles.feedTabs} role="tablist" aria-label="Your feed">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              className={filter === tab.key ? styles.feedTabActive : styles.feedTab}
              onClick={() => void switchFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className={styles.feedLive}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live
        </span>
      </div>

      {list.fresh.length ? (
        <button type="button" className={styles.newPosts} onClick={showFresh}>
          <span className={styles.newDot} aria-hidden="true" />
          {list.fresh.length === 1 ? "1 new post" : `${list.fresh.length} new posts`}
          <span aria-hidden="true">↑</span>
        </button>
      ) : null}

      {error ? (
        <p className={styles.feedError} role="alert">
          {error}
          <button
            type="button"
            className={styles.feedErrorClose}
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      {firstRun ? (
        <>
          <div className={styles.skeleton} aria-hidden="true">
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonLineShort} />
          </div>
          <div className={styles.skeleton} aria-hidden="true">
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonLineShort} />
          </div>
        </>
      ) : list.posts.length ? (
        list.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewer={viewer}
            onPatch={patch}
            onRemove={remove}
            onFollow={follow}
            onReposted={reposted}
          />
        ))
      ) : (
        <section className={styles.feedEmpty}>
          <span className={styles.feedEmptyIcon}>
            <PostsIcon className={styles.navIcon} />
          </span>

          <h3 className={styles.feedEmptyTitle}>{EMPTY_TITLE[filter]}</h3>

          <p className={styles.feedEmptyText}>{EMPTY_TEXT[filter]}</p>

          {filter === "for-you" ? (
            <button
              type="button"
              className={styles.feedEmptyAction}
              onClick={() => setComposerOpen(true)}
            >
              Write the first post
            </button>
          ) : (
            <button
              type="button"
              className={styles.feedEmptyAction}
              onClick={() => void switchFilter("for-you")}
            >
              Back to For you
            </button>
          )}
        </section>
      )}

      {list.cursor ? (
        <>
          {/* The scroll trigger. One pixel tall, invisible, and deliberately
              not the button: the button stays the honest control for a
              keyboard and for a browser without an observer. */}
          <div ref={sentinel} className={styles.scrollSentinel} aria-hidden="true" />

          <button
            type="button"
            className={styles.loadMore}
            onClick={() => void loadMore()}
            disabled={list.loading}
          >
            {list.loading ? "Loading older posts…" : "Show older posts"}
          </button>
        </>
      ) : list.posts.length > 3 ? (
        <p className={styles.listEnd}>
          You are all caught up — {plural(list.posts.length, "post")} on this tab.
        </p>
      ) : null}

      <p className={styles.srOnly} role="status" aria-live="polite">
        {note}
      </p>

      {name ? (
        <p className={styles.feedFoot}>
          Signed in as {name}. Your posts are visible to the workspace; followers-only
          posts are visible to the people who follow you.
        </p>
      ) : null}
    </div>
  );
}
