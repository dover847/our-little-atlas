"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Compass,
  Heart,
  Leaf,
  Library,
  LockKeyhole,
  Moon,
  Search,
  Sparkles,
  Sun,
  Telescope,
  X,
} from "lucide-react";
import {
  activities,
  categories,
  filterActivities,
  landingRotation,
  type Activity,
} from "@/lib/activities";
import { lessons } from "@/lib/lessons";

type View = "discover" | "atlas" | "library";
const favoriteKey = "atlas-next:explore:favorites:v1";
const themeKey = "atlas-next:theme:v1";
const colors = [
  "#d7e0ce",
  "#ddcdb5",
  "#c4d6d3",
  "#ddc6bc",
  "#cfd2df",
  "#e9dabd",
];

export function Atlas() {
  const [view, setView] = useState<View>("discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [wheelCategory, setWheelCategory] = useState("all");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [night, setNight] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Activity | null>(null);
  const [opened, setOpened] = useState<Activity | null>(null);
  const [lesson, setLesson] = useState<(typeof lessons)[number] | null>(null);
  const [error, setError] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestInFlight = useRef(false);
  const opener = useRef<HTMLElement | null>(null);

  function openActivity(activity: Activity) {
    opener.current = document.activeElement as HTMLElement;
    setOpened(activity);
  }
  function openLesson(item: (typeof lessons)[number]) {
    opener.current = document.activeElement as HTMLElement;
    setLesson(item);
  }

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(favoriteKey) || "[]",
      );
      if (Array.isArray(saved))
        setFavorites(saved.filter((id) => activities.some((a) => a.id === id)));
      setNight(localStorage.getItem(themeKey) === "night");
    } catch {
      setStorageNotice(
        "Browser preferences are unavailable. You can still explore.",
      );
    }
    setPreferencesReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(favorites));
      localStorage.setItem(themeKey, night ? "night" : "day");
    } catch {
      setStorageNotice("Preferences will last for this visit only.");
    }
  }, [favorites, night, preferencesReady]);

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function favorite(id: number) {
    setFavorites((saved) =>
      saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id],
    );
  }
  const choices = filterActivities("", wheelCategory);
  const filtered = filterActivities(
    query,
    category,
    favoritesOnly ? favorites : undefined,
  );

  async function spin() {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setSpinning(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/explore/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: choices.map((a) => a.id) }),
      });
      if (!response.ok)
        throw new Error(
          "The wheel couldn’t choose just now. Please try again.",
        );
      const { activity } = (await response.json()) as { activity: Activity };
      const index = choices.findIndex((a) => a.id === activity.id);
      if (index < 0)
        throw new Error("The selection changed. Please try again.");
      setRotation((previous) =>
        landingRotation(previous, index, choices.length),
      );
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      timer.current = setTimeout(
        () => {
          setResult(activity);
          setSpinning(false);
          requestInFlight.current = false;
        },
        reduced ? 50 : 3300,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
      setSpinning(false);
      requestInFlight.current = false;
    }
  }

  const navigation = [
    { id: "discover" as const, title: "Our little world", icon: Compass },
    { id: "atlas" as const, title: "The activity atlas", icon: Library },
    { id: "library" as const, title: "A little wisdom", icon: BookOpen },
  ];

  return (
    <div className={`atlas-app${night ? " night" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("discover")}
          aria-label="Our Little Atlas home"
        >
          <span className="brand-symbol">✳</span>
          <span>
            our little
            <br />
            <strong>atlas.</strong>
          </span>
        </button>
        <div className="world-label">
          <span className="tiny-orbit">✧</span> A WORLD OF OUR OWN
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              disabled={!preferencesReady}
              className={`nav-item${view === id ? " selected" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} strokeWidth={1.5} />
              {title}
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={24} strokeWidth={1.2} />
          <p>
            Something lovely
            <br />
            takes its own time.
          </p>
          <span>No hurry. No expectations.</span>
        </div>
        <div className="sidebar-bottom">
          <button
            className="theme-toggle"
            onClick={() => setNight(!night)}
            aria-label={night ? "Use daylight theme" : "Use evening theme"}
          >
            {night ? <Sun size={18} /> : <Moon size={18} />}
            <span>{night ? "A little daylight" : "A quieter evening"}</span>
          </button>
          <Link className="private-link" href="/sign-in">
            <LockKeyhole size={17} />
            Enter your private space
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <span>
            <span className="status-dot" /> THE NEXT CHAPTER{" "}
            <span className="topbar-divider">/</span>{" "}
            <span className="topbar-sub">An exploration preview</span>
          </span>
          <Link
            className="mobile-private"
            href="/sign-in"
            aria-label="Enter your private space"
          >
            <LockKeyhole size={16} />
          </Link>
          <span className="topbar-right">
            <LockKeyhole size={13} /> Your memories stay in your original atlas
          </span>
        </header>
        <main id="main-content">
          {view === "discover" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <p className="eyebrow">
                    <span /> A PLACE TO KEEP DISCOVERING
                  </p>
                  <h1>
                    Two curious minds.
                    <br />
                    An <em>unfinished</em> world.
                  </h1>
                  <p className="hero-description">
                    A little more wonder. A little less assuming.
                    <br />A place for all the ways we’re still getting to know
                    each other.
                  </p>
                  <button
                    className="button-dark"
                    onClick={() =>
                      document
                        .getElementById("wheel")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Find a little adventure
                    <ArrowDown size={16} />
                  </button>
                  <span className="hero-footnote">
                    Come as you are. Stay as long as you like.
                  </span>
                </div>
                <div className="universe-art" aria-hidden="true">
                  <div className="art-grid" />
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <div className="atlas-sphere">
                    <div className="sphere-line longitude one" />
                    <div className="sphere-line longitude two" />
                    <div className="sphere-line latitude one" />
                    <div className="sphere-line latitude two" />
                    <span className="sphere-star">✧</span>
                  </div>
                  <span className="art-star star-one">✦</span>
                  <span className="art-star star-two">✧</span>
                  <span className="art-star star-three">✳</span>
                  <span className="small-planet planet-one" />
                  <span className="small-planet planet-two" />
                  <span className="art-caption">
                    SO MANY WAYS
                    <br />
                    TO FIND EACH OTHER.
                  </span>
                  <span className="coordinate">
                    35° curiosity · 100° possibility
                  </span>
                </div>
              </section>
              <div className="chapter-divider">
                <span>01 / LET CURIOSITY LEAD</span>
                <span>
                  A small invitation, whenever you’re ready{" "}
                  <Sparkles size={14} />
                </span>
              </div>
              <section
                id="wheel"
                className="wheel-section"
                aria-labelledby="wheel-title"
              >
                <div className="wheel-copy">
                  <p className="eyebrow">THE WHEEL OF POSSIBILITIES</p>
                  <h2 id="wheel-title">
                    Let a little chance
                    <br />
                    <em>open a door.</em>
                  </h2>
                  <p>
                    Seventy-two ways to think, laugh, wonder, and see things a
                    little differently. Pick a chapter, then see where you land.
                  </p>
                  <label className="field-label" htmlFor="wheel-category">
                    What are you in the mood for?
                  </label>
                  <select
                    id="wheel-category"
                    value={wheelCategory}
                    disabled={!preferencesReady || spinning}
                    onChange={(e) => {
                      setWheelCategory(e.target.value);
                      setResult(null);
                    }}
                  >
                    <option value="all">A little bit of everything</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    className="button-dark spin-button"
                    onClick={spin}
                    disabled={!preferencesReady || spinning}
                  >
                    <Sparkles size={17} />
                    {spinning
                      ? "Following the possibilities…"
                      : "Spin the wheel"}
                    <ArrowUpRight size={17} />
                  </button>
                  <p className="local-note">
                    Just exploring. Spins aren’t saved or shared in this
                    preview.
                  </p>
                </div>
                <div className="wheel-stage">
                  <div className="wheel-pointer" aria-hidden="true" />
                  <div className="wheel-halo">
                    <div
                      className={`wheel-disc${spinning ? " is-spinning" : ""}`}
                      data-testid="wheel-disc"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        background: `conic-gradient(${choices.map((_, i) => `${colors[i % colors.length]} ${(i * 360) / choices.length}deg ${((i + 1) * 360) / choices.length}deg`).join(",")})`,
                      }}
                      aria-hidden="true"
                    >
                      {choices
                        .filter(
                          (_, i) => i % Math.ceil(choices.length / 12) === 0,
                        )
                        .map((a) => {
                          const i = choices.indexOf(a);
                          const angle = ((i + 0.5) * 360) / choices.length;
                          return (
                            <span
                              className="wheel-mark"
                              key={a.id}
                              style={{
                                transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(calc(var(--wheel-size) * -.38)) rotate(${-angle}deg)`,
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          );
                        })}
                    </div>
                    <div className="wheel-hub" aria-hidden="true">
                      ✳
                    </div>
                  </div>
                  <span className="wheel-undertext">
                    {choices.length} POSSIBLE BEGINNINGS
                  </span>
                </div>
                <div
                  className="spin-announcement"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                  {result && (
                    <div className="spin-result">
                      <div>
                        <p className="eyebrow">
                          A LITTLE CHANCE CHOSE · {result.category}
                        </p>
                        <h3>{result.title}</h3>
                        <p>{result.description}</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => openActivity(result)}
                      >
                        Explore this activity
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <section className="doorways" aria-labelledby="doorways-title">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">THERE’S MORE THAN ONE WAY IN</p>
                    <h2 id="doorways-title">Follow what feels like you.</h2>
                  </div>
                  <span>Nothing to complete. Just things to discover.</span>
                </div>
                <div className="doorway-grid">
                  <button
                    className="doorway sage"
                    onClick={() => navigate("atlas")}
                  >
                    <span className="doorway-icon">
                      <Telescope size={25} strokeWidth={1.4} />
                    </span>
                    <span className="eyebrow">FOR THE CURIOUS</span>
                    <h3>
                      A whole atlas
                      <br />
                      of possibilities.
                    </h3>
                    <p>
                      Find an experiment, a playful question, or a different
                      kind of conversation.
                    </p>
                    <span className="doorway-link">
                      Explore 72 activities
                      <ArrowUpRight size={19} />
                    </span>
                  </button>
                  <button
                    className="doorway clay"
                    onClick={() => {
                      navigate("atlas");
                      setFavoritesOnly(true);
                    }}
                  >
                    <span className="doorway-icon">
                      <Heart size={25} strokeWidth={1.4} />
                    </span>
                    <span className="eyebrow">FOR ANOTHER DAY</span>
                    <h3>
                      Keep a little
                      <br />
                      curiosity for later.
                    </h3>
                    <p>
                      A small collection of activities that catch your eye, kept
                      on this browser.
                    </p>
                    <span className="doorway-link">
                      Your saved possibilities
                      <ArrowUpRight size={19} />
                    </span>
                  </button>
                  <button
                    className="doorway cream"
                    onClick={() => navigate("library")}
                  >
                    <span className="doorway-icon">
                      <BookOpen size={25} strokeWidth={1.4} />
                    </span>
                    <span className="eyebrow">FOR A LITTLE PERSPECTIVE</span>
                    <h3>
                      Understanding
                      <br />
                      is an ongoing art.
                    </h3>
                    <p>
                      Gentle ideas about interpretation, closeness, and making
                      room for each other.
                    </p>
                    <span className="doorway-link">
                      Open the little library
                      <ArrowUpRight size={19} />
                    </span>
                  </button>
                </div>
              </section>
              <section className="thought">
                <span aria-hidden="true">✧</span>
                <p>
                  “Not a map of who we are.
                  <br />A place to keep discovering who we’re becoming.”
                </p>
                <span className="eyebrow">THE SPIRIT OF OUR LITTLE ATLAS</span>
              </section>
            </>
          )}

          {view === "atlas" && (
            <section className="explorer">
              <p className="eyebrow">AN EVER-GROWING COLLECTION</p>
              <h1>
                The activity <em>atlas.</em>
              </h1>
              <p className="page-intro">
                A question, an experiment, a wonderfully strange idea.
                <br />
                Choose a door you haven’t opened before.
              </p>
              <div className="explorer-toolbar">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a little adventure…"
                    aria-label="Search activities"
                  />
                </div>
                <select
                  aria-label="Filter activity category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">All chapters</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  className={`favorite-filter${favoritesOnly ? " active" : ""}`}
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                  aria-pressed={favoritesOnly}
                >
                  <Heart
                    size={16}
                    fill={favoritesOnly ? "currentColor" : "none"}
                  />
                  Saved ({favorites.length})
                </button>
              </div>
              <div className="results-heading">
                <span role="status">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "possibility" : "possibilities"} to
                  explore
                </span>
                <span>Favorites stay on this browser</span>
              </div>
              <div className="activity-grid">
                {filtered.map((activity) => (
                  <article key={activity.id} className="activity-card">
                    <div className="activity-top">
                      <span>
                        {String(activity.id).padStart(2, "0")}{" "}
                        <span>/ {activity.category}</span>
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`${favorites.includes(activity.id) ? "Unsave" : "Save"} ${activity.title}`}
                        aria-pressed={favorites.includes(activity.id)}
                        onClick={() => favorite(activity.id)}
                      >
                        <Heart
                          size={18}
                          fill={
                            favorites.includes(activity.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                    <h2>{activity.title}</h2>
                    <p>{activity.description}</p>
                    <button
                      className="text-button"
                      onClick={() => openActivity(activity)}
                    >
                      A little closer
                      <ArrowUpRight size={17} />
                    </button>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={28} />
                  <h2>A different door, perhaps?</h2>
                  <p>
                    {favoritesOnly
                      ? "Save an activity with its heart button, or explore the full atlas."
                      : "Try another word or chapter. There are plenty of possibilities."}
                  </p>
                  <button
                    className="button-dark"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                      setFavoritesOnly(false);
                    }}
                  >
                    Show all activities
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
          )}

          {view === "library" && (
            <section className="library-page">
              <p className="eyebrow">THE LITTLE PHILOSOPHY LIBRARY</p>
              <h1>
                Stay curious.
                <br />
                <em>Leave room.</em>
              </h1>
              <p className="page-intro">
                Some thoughts to sit with. Some questions to carry.
                <br />
                No right pace, and no one keeping score.
              </p>
              <div className="lesson-grid">
                {lessons.map((item) => (
                  <button
                    key={item.number}
                    className="lesson-card"
                    onClick={() => openLesson(item)}
                  >
                    <span className="lesson-number">{item.number}</span>
                    <p className="eyebrow">{item.concept}</p>
                    <h2>{item.title}</h2>
                    <p>{item.intro}</p>
                    <span className="text-button">
                      Read & reflect
                      <ArrowUpRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="library-footnote">
                These are original reflective exercises, not clinical advice or
                measures of your connection. English is the first edition;
                Chinese and Japanese editions are planned.
              </p>
            </section>
          )}
          {storageNotice && (
            <p className="storage-notice" role="status">
              {storageNotice}
            </p>
          )}
          <footer className="footer">
            <span>
              our little atlas. <span>Always a little more to discover.</span>
            </span>
            <span>
              MADE FOR CURIOSITY, NEVER OBLIGATION{" "}
              <span aria-hidden="true">✧</span>
            </span>
          </footer>
        </main>
      </div>

      <Dialog.Root
        open={!!opened}
        onOpenChange={(open) => {
          if (!open) setOpened(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
          >
            <Dialog.Close className="dialog-close" aria-label="Close activity">
              <X size={20} />
            </Dialog.Close>
            <p className="eyebrow">{opened?.category} · A LITTLE INVITATION</p>
            <Dialog.Title>{opened?.title}</Dialog.Title>
            <Dialog.Description>{opened?.description}</Dialog.Description>
            <div className="invitation-note">
              <Leaf size={20} />
              <p>
                Try it together, adapt it, or keep it for another day. There’s
                no right way to begin.
              </p>
            </div>
            <button
              className="button-dark"
              onClick={() => {
                if (opened) favorite(opened.id);
              }}
            >
              {opened && favorites.includes(opened.id) ? (
                <Check size={17} />
              ) : (
                <Heart size={17} />
              )}
              {opened && favorites.includes(opened.id)
                ? "Saved on this browser"
                : "Save for a little later"}
            </button>
            <p className="local-note">
              Shared notes will return with individual accounts. Your existing
              notes remain in your original atlas.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!lesson}
        onOpenChange={(open) => {
          if (!open) setLesson(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content lesson-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
          >
            <Dialog.Close
              className="dialog-close"
              aria-label="Close reflection"
            >
              <X size={20} />
            </Dialog.Close>
            <p className="eyebrow">{lesson?.concept}</p>
            <Dialog.Title>{lesson?.title}</Dialog.Title>
            <Dialog.Description>{lesson?.intro}</Dialog.Description>
            <p>{lesson?.body}</p>
            <div className="reflection-prompt">
              <span className="eyebrow">A MOMENT TO REFLECT</span>
              <p>{lesson?.exercise}</p>
            </div>
            <p className="local-note">
              An invitation to reflect. Nothing you think or say here is
              recorded.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
