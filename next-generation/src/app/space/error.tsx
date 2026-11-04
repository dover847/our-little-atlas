"use client";
export default function SpaceError({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">A LITTLE PAUSE</p>
        <h1>
          Your space needs
          <br />
          <em>a moment.</em>
        </h1>
        <p>
          We couldn’t load your pages. Nothing here has been reset or replaced.
        </p>
        <button className="button-dark" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
