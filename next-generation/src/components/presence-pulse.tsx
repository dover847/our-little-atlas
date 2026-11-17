"use client";
import { useEffect, useState } from "react";

type Status = { selfOnline: boolean; partnerOnline: boolean; bothOnline: boolean };

export function PresencePulse({ spaceId, quiet = false }: { spaceId: string; quiet?: boolean }) {
  const [state, setState] = useState<"checking" | "both" | "me" | "unavailable">("checking");

  useEffect(() => {
    let mounted = true;
    let requestInProgress = false;
    async function report() {
      if (document.hidden || requestInProgress) return;
      requestInProgress = true;
      try {
        const res = await fetch("/api/presence?spaceId=" + encodeURIComponent(spaceId), {
          method: "POST", credentials: "same-origin", cache: "no-store",
        });
        if (!res.ok) throw new Error("Presence not available");
        const data = await res.json() as Status;
        if (mounted) setState(data.bothOnline ? "both" : data.selfOnline ? "me" : "unavailable");
      } catch {
        if (mounted) setState("unavailable");
      } finally {
        requestInProgress = false;
      }
    }
    void report();
    const interval = window.setInterval(() => { void report(); }, 25000);
    document.addEventListener("visibilitychange", report);
    window.addEventListener("focus", report);
    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", report);
      window.removeEventListener("focus", report);
    };
  }, [spaceId]);

  if (quiet) return null;
  const label = state === "both" ? "Both online" :
    state === "me" ? "You're online · waiting for your companion" :
    state === "checking" ? "Checking our connection…" : "Online status unavailable";
  return (
    <div className="atlas-presence" role="status" aria-live="polite">
      <span className={"atlas-presence-dot" + (state === "both" ? " is-both" : "")} />
      <span>{label}</span>
    </div>
  );
}
