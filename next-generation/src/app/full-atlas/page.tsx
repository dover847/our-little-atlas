import Link from "next/link";

// The shell contains no private data. Authentication and membership are
// enforced at every data endpoint, so the artwork can render instantly.
export const dynamic = "force-static";
export default function FullAtlas() {
  return (
    <div className="atlas-classic-shell">
      <nav className="atlas-classic-bar" aria-label="Our Little Atlas navigation">
        <Link href="/home">← Our Little Atlas home</Link>
        <Link href="/space">Shared writing & notifications →</Link>
      </nav>
      <iframe
        src="/classic/index.html"
        title="Our Little Atlas — complete shared experience"
        className="atlas-classic-frame"
        loading="eager"
        referrerPolicy="same-origin"
      />
    </div>
  );
}
