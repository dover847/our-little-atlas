import { randomInt } from "node:crypto";
import { activities, validateSelection } from "@/lib/activities";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Send a JSON selection." }, { status: 415 });
  }
  // Public exploration only: no account, saved history, or memory writes.
  const text = await request.text();
  if (text.length > 2000)
    return Response.json({ error: "Selection is too large." }, { status: 413 });
  try {
    const body = JSON.parse(text);
    const ids = validateSelection(body?.ids);
    const selected = ids[randomInt(ids.length)];
    return Response.json(
      { activity: activities.find((a) => a.id === selected) },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      { error: "Choose valid activities and try again." },
      { status: 400 },
    );
  }
}
