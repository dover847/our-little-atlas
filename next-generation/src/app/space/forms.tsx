"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowRight, Check, Copy, LockKeyhole, Users } from "lucide-react";
import {
  createFirstSpace,
  createInvitation,
  acceptInvitation,
  saveWriting,
  registerForInvitation,
  acceptEmailInvitation,
} from "./actions";
import { initialResult, writingKinds, type Writing } from "@/lib/writing";

export function CreateSpaceForm() {
  const [state, action, pending] = useActionState(
    createFirstSpace,
    initialResult,
  );
  return (
    <form action={action} className="studio-form">
      <label htmlFor="world-name">A name for your world</label>
      <input
        id="world-name"
        name="name"
        maxLength={120}
        defaultValue="Our little world"
        required
      />
      {state.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      <button className="button-dark" disabled={pending}>
        {pending ? "Making a little room…" : "Create our space"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function PendingInvitation({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(
    acceptEmailInvitation,
    initialResult,
  );
  return (
    <form action={action} className="pending-inbox">
      <input type="hidden" name="id" value={id} />
      <h3>{name}</h3>
      <p>
        Joining lets you read pages deliberately shared in this space. Your
        private writing stays yours.
      </p>
      {state.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button-dark" disabled={pending}>
        {pending ? "Opening the door…" : "Accept & join this space"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function WritingForm({
  spaceId,
  entry,
}: {
  spaceId: string;
  entry?: Writing;
}) {
  const [state, action, pending] = useActionState(saveWriting, initialResult);
  const [title, setTitle] = useState(entry?.title || "");
  const [body, setBody] = useState(entry?.body || "");
  const [visibility, setVisibility] = useState(entry?.visibility || "private");
  const [requestId, setRequestId] = useState("");
  const [identity, setIdentity] = useState({
    id: entry?.id || "",
    version: entry?.version || 0,
  });
  useEffect(() => setRequestId(crypto.randomUUID()), []);
  useEffect(() => {
    if (state.entryId && state.version)
      setIdentity({ id: state.entryId, version: state.version });
  }, [state.entryId, state.version]);
  const savedId = state.entryId || identity.id;
  const savedVersion = state.version || identity.version;
  return (
    <form action={action} className="studio-form writing-form">
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="requestId" value={requestId} />
      {savedId && (
        <>
          <input type="hidden" name="id" value={savedId} />
          <input type="hidden" name="version" value={savedVersion} />
        </>
      )}
      <label htmlFor={`title-${entry?.id || "new"}`}>
        Give this page a name <span>(optional)</span>
      </label>
      <input
        id={`title-${entry?.id || "new"}`}
        name="title"
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <label htmlFor={`kind-${entry?.id || "new"}`}>
        What are you writing?
      </label>
      <select
        id={`kind-${entry?.id || "new"}`}
        name="kind"
        defaultValue={entry?.kind || "Reflection"}
      >
        {writingKinds.map((kind) => (
          <option key={kind}>{kind}</option>
        ))}
      </select>
      <label htmlFor={`body-${entry?.id || "new"}`}>Your words</label>
      <textarea
        id={`body-${entry?.id || "new"}`}
        name="body"
        rows={7}
        maxLength={10000}
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="A thought, a question, a small thing you want to remember…"
      />
      <fieldset className="visibility-options">
        <legend>Who can read this page?</legend>
        <label>
          <input
            type="radio"
            name="visibility"
            value="private"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
          />
          <LockKeyhole size={15} />
          <span>
            Only me<small>A private page in this space</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="visibility"
            value="shared"
            checked={visibility === "shared"}
            onChange={() => setVisibility("shared")}
          />
          <Users size={15} />
          <span>
            Share with this space
            <small>Members can read it. You keep editing control.</small>
          </span>
        </label>
      </fieldset>
      {visibility === "shared" && (
        <p className="sharing-note">
          Saving will make the current page visible to everyone in this space.
          Earlier revisions remain yours alone.
        </p>
      )}
      {state.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="save-message">
          <Check size={15} />
          {state.message}
        </p>
      )}
      <button className="button-dark" disabled={pending || !requestId}>
        {pending
          ? "Keeping your words…"
          : savedId
            ? "Save changes"
            : visibility === "shared"
              ? "Save & share this page"
              : "Save my private page"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function InvitationForm({ spaceId }: { spaceId: string }) {
  const [state, action, pending] = useActionState(
    createInvitation,
    initialResult,
  );
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link =
    state.invitation && origin
      ? `${origin}/join#token=${state.invitation}`
      : "";
  return (
    <form action={action} className="studio-form">
      <input type="hidden" name="spaceId" value={spaceId} />
      <label htmlFor="invite-email">Their email address</label>
      <input
        id="invite-email"
        name="email"
        type="email"
        maxLength={254}
        required
        autoComplete="off"
      />
      <p className="field-help">
        Only a verified account with this email can accept. The link expires in
        seven days. Creating it doesn’t send an email.
      </p>
      <button className="button-dark" disabled={pending}>
        {pending ? "Preparing an invitation…" : "Create a private invitation"}
        <ArrowRight size={16} />
      </button>
      {state.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      {link && (
        <div className="invitation-link">
          <label htmlFor="private-invite-link">
            Your invitation — share it privately
          </label>
          <input
            id="private-invite-link"
            value={link}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
            {copied ? "Copied" : "Copy invitation"}
          </button>
          <p className="field-help">
            The full link is shown here once. If you lose it, revoke this
            invitation and create another.
          </p>
        </div>
      )}
    </form>
  );
}

export function JoinForm() {
  const [state, action, pending] = useActionState(
    acceptInvitation,
    initialResult,
  );
  const [token, setToken] = useState("");
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const value = hash.get("token");
    if (value) setToken(value);
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);
  function update(value: string) {
    try {
      const url = new URL(value);
      setToken(new URLSearchParams(url.hash.slice(1)).get("token") || "");
    } catch {
      setToken(value.trim());
    }
  }
  return (
    <>
      <form action={action} className="studio-form">
        <label htmlFor="space-invite">Private invitation link or code</label>
        <input
          id="space-invite"
          name="token"
          value={token}
          onChange={(e) => update(e.target.value)}
          required
          autoComplete="off"
          spellCheck={false}
        />
        {state.error && (
          <p role="alert" className="auth-error">
            {state.error}
          </p>
        )}
        <button className="button-dark" disabled={pending}>
          {pending ? "Opening the door…" : "Accept invitation"}
          <ArrowRight size={16} />
        </button>
        <p className="field-help">
          Sign in with the email this invitation was created for. A link alone
          cannot grant access to someone else.
        </p>
      </form>
      <details className="registration-details">
        <summary>New here? Set up your own account</summary>
        <RegistrationForm token={token} />
      </details>
    </>
  );
}

function RegistrationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    registerForInvitation,
    initialResult,
  );
  return (
    <form action={action} className="studio-form">
      <input type="hidden" name="token" value={token} />
      <label htmlFor="registration-email">Invited email address</label>
      <input
        id="registration-email"
        name="email"
        type="email"
        maxLength={254}
        required
        autoComplete="email"
      />
      <label htmlFor="registration-password">Choose a password</label>
      <input
        id="registration-password"
        name="password"
        type="password"
        minLength={12}
        maxLength={128}
        required
        autoComplete="new-password"
      />
      {state.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="field-help">
          {state.message}
        </p>
      )}
      <button className="button-dark" disabled={pending}>
        {pending ? "Preparing verification…" : "Email my account confirmation"}
      </button>
    </form>
  );
}
