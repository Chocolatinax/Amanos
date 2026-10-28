"use client";
import { useIsDark, useTheme } from "@/lib/theme";
import Icon from "./Icon";

/** Botón para pasar de modo claro a oscuro y viceversa. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { choose } = useTheme();
  const dark = useIsDark();
  const label = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return (
    <button onClick={() => choose(dark ? "light" : "dark")} aria-label={label} title={label}
      className={`grid h-10 w-10 place-items-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface ${className}`}>
      <Icon name={dark ? "light_mode" : "dark_mode"} className="text-xl" />
    </button>
  );
}
