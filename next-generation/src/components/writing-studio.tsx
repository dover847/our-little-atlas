"use client";

import { useState } from "react";
import { BookOpen, LockKeyhole, PenLine, Users, X } from "lucide-react";
import { WritingForm } from "@/app/space/forms";
import type { Writing, WritingRevision } from "@/lib/writing";

export function WritingStudio({
  spaceId,
  userId,
  entries,
  revisions,
}: {
  spaceId: string;
  userId: string;
  entries: Writing[];
  revisions: WritingRevision[];
}) {
  const [view, setView] = useState<"all" | "private" | "shared">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const filtered = entries.filter(
    (entry) => view === "all" || entry.visibility === view,
  );
  return (
    <section className="writing-studio" aria-labelledby="writing-heading">
      <div className="studio-section-head">
        <div>
          <p className="eyebrow">THE WRITING STUDIO</p>
          <h2 id="writing-heading">
            A page of your own.
            <br />
            <em>A thought to share.</em>
          </h2>
        </div>
        <button
          className="button-dark"
          onClick={() => setComposing(!composing)}
          aria-expanded={composing}
        >
          <PenLine size={16} />
          {composing ? "Close new page" : "Write a little page"}
        </button>
      </div>
      {composing && (
        <div className="writing-composer">
          <p className="eyebrow">A NEW PAGE · PRIVATE BY DEFAULT</p>
          <WritingForm spaceId={spaceId} />
        </div>
      )}
      <div className="writing-tabs" role="group" aria-label="Browse writing">
        {(["all", "private", "shared"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            aria-pressed={view === item}
          >
            {item === "all"
              ? "All visible pages"
              : item === "private"
                ? "My private pages"
                : "Shared pages"}
          </button>
        ))}
      </div>
      <div className="writing-pages">
        {filtered.length ? (
          filtered.map((entry) => (
            <article className="writing-page" key={entry.id}>
              <div className="writing-meta">
                <span>
                  {entry.visibility === "private" ? (
                    <LockKeyhole size={13} />
                  ) : (
                    <Users size={13} />
                  )}{" "}
                  {entry.visibility === "private"
                    ? "Only you"
                    : "Shared with this space"}
                </span>
                <span>
                  {entry.kind} ·{" "}
                  {new Date(entry.created_at).toLocaleDateString("en", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
              <h3>{entry.title || "A little untitled page"}</h3>
              <p className="writing-body">{entry.body}</p>
              <div className="writing-page-bottom">
                <span>
                  {entry.author_id === userId
                    ? "Written by you"
                    : "Written by another member"}{" "}
                  · version {entry.version}
                </span>
                {entry.author_id === userId && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditing(editing === entry.id ? null : entry.id)
                    }
                    aria-expanded={editing === entry.id}
                  >
                    {editing === entry.id ? (
                      <X size={14} />
                    ) : (
                      <PenLine size={14} />
                    )}{" "}
                    {editing === entry.id ? "Close editor" : "Edit my page"}
                  </button>
                )}
              </div>
              {entry.author_id === userId &&
                revisions.some(
                  (revision) => revision.entry_id === entry.id,
                ) && (
                  <details className="revision-history">
                    <summary>Earlier versions · only you</summary>
                    {revisions
                      .filter((revision) => revision.entry_id === entry.id)
                      .slice(0, 5)
                      .map((revision) => (
                        <section key={revision.version}>
                          <p className="eyebrow">
                            VERSION {revision.version} ·{" "}
                            {revision.visibility === "private"
                              ? "WAS PRIVATE"
                              : "WAS SHARED"}
                          </p>
                          <h4>{revision.title || "An untitled page"}</h4>
                          <p className="writing-body">{revision.body}</p>
                        </section>
                      ))}
                    <p className="field-help">
                      Showing up to five recent revisions. Earlier versions
                      remain stored.
                    </p>
                  </details>
                )}
              {editing === entry.id && (
                <WritingForm key={entry.id} spaceId={spaceId} entry={entry} />
              )}
            </article>
          ))
        ) : (
          <div className="studio-empty">
            <BookOpen size={28} />
            <h3>
              {view === "shared"
                ? "Nothing shared yet."
                : "An unwritten beginning."}
            </h3>
            <p>
              Your private pages are visible only to you. Sharing is always a
              choice.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
