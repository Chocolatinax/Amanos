"use client";
import { useEffect, useRef, useState } from "react";
import type { Sign } from "@/lib/signs";
import { useIsDark } from "@/lib/theme";
import Icon from "./Icon";

export const AVATAR_SIGN_IDS = ["a", "b", "c", "adios", "tu", "gracias", "hola", "buenos-dias", "buenas-tardes"];
// The VRM is ~14 MB; slow phone connections need time, but a dead load must not spin forever.
const LOAD_TIMEOUT_MS = 45000;

/** Avatar reference shared by lessons, practice and dashboard cards. */
export default function SignVideo({ sign, className = "", variant = "mini", ratio = "4 / 3" }: {
  sign: Sign; className?: string; variant?: "mini" | "full";
  ratio?: string; fit?: "contain" | "cover";
}) {
  const available = AVATAR_SIGN_IDS.includes(sign.id);
  const dark = useIsDark();
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!available || dark === null) return;
    setState("loading");
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== "amanos-avatar") return;
      if (e.data.state === "ready" || e.data.state === "error") setState(e.data.state);
    };
    const timer = setTimeout(() => setState(s => s === "loading" ? "error" : s), LOAD_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    return () => { clearTimeout(timer); window.removeEventListener("message", onMessage); };
  }, [available, sign.id, attempt, dark]);

  // Same colors as the viewer scene. Resolved in CSS so the first paint already matches the theme.
  const stage = "bg-[#e6eeeb] text-[#244c45] dark:bg-[#1a2131] dark:text-[#dce6fa]";
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-inverse-surface ${className}`} style={ratio === "none" ? undefined : { aspectRatio: ratio }}>
      {available ? <>
        {/* Se monta cuando ya se conoce el tema, para no descargar el avatar dos veces. */}
        {dark !== null && <iframe ref={frame} key={`${sign.id}-${attempt}-${dark ? "d" : "l"}`} src={`/avatar/viewer.html?sign=${sign.id}&compact=${variant === "mini" ? "1" : "0"}${dark ? "&theme=dark" : ""}&v=hands-14`}
          title={`Avatar: ${sign.glosa}`} className="absolute inset-0 h-full w-full border-0" />}
        {state === "loading" && <div role="status" className={`pointer-events-none absolute inset-0 grid place-items-center ${stage}`}>
          <span className="flex flex-col items-center gap-2 px-3 text-center text-xs font-semibold"><span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent" />Cargando avatar…</span>
        </div>}
        {state === "error" && <div role="alert" className={`absolute inset-0 grid place-items-center p-3 text-center ${stage}`}>
          <div className="flex flex-col items-center gap-2 text-xs">
            <span className="font-semibold">No se pudo cargar el avatar.</span>
            <button onClick={() => setAttempt(a => a + 1)} className="min-h-9 rounded-full bg-[#244c45] px-4 font-semibold text-white">Reintentar</button>
          </div>
        </div>}
      </>
        : <div className="grid h-full min-h-40 w-full place-items-center bg-gradient-to-br from-primary-container to-brand-700 text-on-primary">
          <div className="px-4 text-center">
            <Icon name="sign_language" className="text-4xl opacity-80" />
            <div className="mt-1 font-headline-sm">{sign.glosa}</div>
            <div className="mt-1 font-body-sm opacity-80">Avatar en preparación</div>
          </div>
        </div>}
    </div>
  );
}
