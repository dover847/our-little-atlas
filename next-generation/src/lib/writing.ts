export const writingKinds = [
  "Memory",
  "Letter",
  "Reflection",
  "Poem",
  "Question",
  "Gratitude",
  "Interpretation",
] as const;
export type WritingKind = (typeof writingKinds)[number];
export type Writing = {
  id: string;
  space_id: string;
  author_id: string;
  title: string;
  body: string;
  kind: WritingKind;
  visibility: "private" | "shared";
  version: number;
  created_at: string;
  updated_at: string;
};
export type WritingRevision = Pick<
  Writing,
  "title" | "body" | "kind" | "visibility" | "version"
> & { entry_id: string; recorded_at: string };
export type ActionResult = {
  error: string;
  message?: string;
  invitation?: string;
  entryId?: string;
  version?: number;
};
export const initialResult: ActionResult = { error: "" };
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizedEmail(value: unknown) {
  if (typeof value !== "string") throw new Error("Enter an email address.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  return email;
}
export function parseWriting(form: FormData) {
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "");
  const kind = String(form.get("kind") || "Reflection");
  // Missing visibility always means private; malformed values never imply sharing.
  const visibility = String(form.get("visibility") || "private");
  const spaceId = String(form.get("spaceId") || "");
  if (!uuidPattern.test(spaceId))
    throw new Error("Choose a space you belong to.");
  if (
    title.length > 120 ||
    !body.trim() ||
    body.length > 10000 ||
    /\0/.test(title + body)
  )
    throw new Error(
      "Add your words (up to 10,000 characters) and a title of up to 120 characters.",
    );
  if (
    !writingKinds.includes(kind as WritingKind) ||
    !["private", "shared"].includes(visibility)
  )
    throw new Error("Choose a valid writing type and visibility.");
  return {
    title,
    body,
    kind: kind as WritingKind,
    visibility: visibility as "private" | "shared",
    space_id: spaceId,
  };
}
