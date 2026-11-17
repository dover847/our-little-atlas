"use client";
import { useEffect } from "react";

type SharedLook = {
 sharedTheme?: string;
 accentColor?: string;
 backgroundUrl?: string | null;
 updatedAt?: string;
};

const allowed = new Set(["original","rose","forest","ocean","violet","sunrise","twilight"]);
export function SharedThemeSync() {
 useEffect(() => {
  const shell = document.querySelector<HTMLElement>(".ala-shell, .atlas-wheel-app, .atlas-appearance-app, .atlas-modern-app");
  if (!shell) return;
  let active = true;
  let inFlight = false;
  async function refresh() {
   if (!active || document.hidden || inFlight) return;
   inFlight = true;
   try {
    const res = await fetch("/api/atmosphere", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return;
    const look = await res.json() as SharedLook;
    if (!active) return;
    shell!.dataset.atlasTheme = allowed.has(look.sharedTheme || "") ? look.sharedTheme : "original";
    if (/^#[0-9a-fA-F]{6}$/.test(look.accentColor || "")) {
      shell!.style.setProperty("--atlas-accent", look.accentColor!);
    }
    shell!.style.setProperty("--atlas-photo", look.backgroundUrl ? "url(" + JSON.stringify(look.backgroundUrl) + ")" : "none");
   } catch { /* Keep current appearance if offline. */ }
   finally { inFlight = false; }
  }
  void refresh();
  const id = window.setInterval(() => { void refresh(); }, 12000);
  window.addEventListener("focus", refresh);
  window.addEventListener("atlas-theme-changed", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
   active = false;
   window.clearInterval(id);
   window.removeEventListener("focus", refresh);
   window.removeEventListener("atlas-theme-changed", refresh);
   document.removeEventListener("visibilitychange", refresh);
  };
 }, []);
 return null;
}
