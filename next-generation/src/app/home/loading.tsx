import "./home.css";

export default function LoadingAtlasHome() {
  return (
    <main className="ala-launch" role="status" aria-live="polite">
      <div className="ala-launch-flower" aria-hidden="true">✿</div>
      <div className="ala-launch-content">
        <div className="ala-launch-brand">Our Little<br/>Atlas <span>✧</span></div>
        <p>A SHARED MAP OF OUR DAYS, IDEAS, FEELINGS AND ADVENTURES</p>
        <div className="ala-launch-orbit" aria-hidden="true"><span>♡</span></div>
        <div className="ala-launch-label">Opening our Atlas…</div>
        <div className="ala-launch-small">Preparing our shared world</div>
      </div>
    </main>
  );
}
