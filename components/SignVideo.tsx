"use client";
import { useEffect, useRef, useState } from "react";
import type { Sign } from "@/lib/signs";
import Icon from "./Icon";

const SPEEDS = [0.5, 0.75, 1];

/** Video de referencia. `full` agrega controles (pausa, bucle, velocidad, espejo). Si el mp4 no existe, muestra un placeholder. */
export default function SignVideo({ sign, className = "", variant = "mini", ratio = "4 / 3", fit = "contain" }: { sign: Sign; className?: string; variant?: "mini" | "full"; ratio?: string; fit?: "contain" | "cover" }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [mirror, setMirror] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => { setMissing(false); setPlaying(true); setProgress(0); }, [sign.video]);
  useEffect(() => { if (ref.current) ref.current.playbackRate = speed; }, [speed, sign.video]);

  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) { v.play(); } else { v.pause(); } };
  const full = variant === "full";

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-inverse-surface ${className}`} style={ratio === "none" ? undefined : { aspectRatio: ratio }}>
      {!missing ? (
        <video ref={ref} key={sign.video} src={sign.video} autoPlay loop={loop} muted playsInline
          className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} style={mirror ? { transform: "scaleX(-1)" } : undefined}
          onError={() => setMissing(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onTimeUpdate={e => { const v = e.currentTarget; setProgress(v.duration ? v.currentTime / v.duration : 0); }} />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-container to-primary text-on-primary">
          <div className="px-4 text-center">
            <Icon name="videocam_off" className="text-4xl opacity-80" />
            <div className="mt-1 font-headline-sm">{sign.glosa}</div>
            <div className="mt-1 font-body-sm opacity-80">Video de referencia pendiente</div>
          </div>
        </div>
      )}
      {full && !missing && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-space-md pt-10">
          <div className="mb-space-sm h-1 overflow-hidden rounded-full bg-white/30"><div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} /></div>
          <div className="flex items-center gap-space-sm text-white">
            <button onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"} className="grid h-12 w-12 place-items-center rounded-full bg-primary-container hover:brightness-110">
              <Icon name={playing ? "pause" : "play_arrow"} fill />
            </button>
            <button onClick={() => setLoop(l => !l)} aria-pressed={loop} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-label-sm ${loop ? "bg-white/25" : "bg-white/10"}`}>
              <Icon name="repeat" className="text-base" /> {loop ? "Bucle activado" : "Sin bucle"}
            </button>
            <button onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])} className="rounded-full bg-white/10 px-3 py-1 font-label-sm" aria-label="Cambiar velocidad">{speed}x</button>
            <div className="flex-1" />
            <button onClick={() => { const v = ref.current; if (v) { v.currentTime = 0; v.play(); } }} aria-label="Repetir desde el inicio" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><Icon name="replay" /></button>
            <button onClick={() => setMirror(m => !m)} aria-pressed={mirror} aria-label="Espejo" className={`grid h-9 w-9 place-items-center rounded-full ${mirror ? "bg-white/25" : "hover:bg-white/15"}`}><Icon name="flip" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
