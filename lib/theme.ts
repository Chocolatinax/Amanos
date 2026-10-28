"use client";
import { useCallback, useEffect, useState } from "react";
import { THEME_COLORS, THEME_KEY } from "./theme-script";

export type ThemePref = "system" | "light" | "dark";
const CHANGE = "amanos-theme";

function readPref(): ThemePref {
  try { const p = localStorage.getItem(THEME_KEY); return p === "light" || p === "dark" ? p : "system"; } catch { return "system"; }
}
function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light));
}

/** Montado una vez en el layout: sigue al sistema (en modo automático) y a los cambios de otras pestañas. */
export function ThemeSync() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const reapply = () => apply(readPref());
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY || e.key === null) { reapply(); window.dispatchEvent(new Event(CHANGE)); } };
    reapply();
    media.addEventListener("change", reapply);
    window.addEventListener("storage", onStorage);
    return () => { media.removeEventListener("change", reapply); window.removeEventListener("storage", onStorage); };
  }, []);
  return null;
}

/** true cuando el tema aplicado es oscuro; null antes de montar (en el servidor no se conoce). */
export function useIsDark() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setDark(html.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** Preferencia elegida (automático, claro u oscuro) y cómo cambiarla. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  useEffect(() => {
    const sync = () => setPref(readPref());
    sync();
    window.addEventListener(CHANGE, sync);
    return () => window.removeEventListener(CHANGE, sync);
  }, []);
  const choose = useCallback((p: ThemePref) => {
    try { if (p === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, p); } catch {}
    apply(p); window.dispatchEvent(new Event(CHANGE));
  }, []);
  return { pref, choose };
}
