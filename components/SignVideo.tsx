"use client";
import { useState } from "react";
import type { Sign } from "@/lib/signs";

/** Video de referencia en loop. Si el mp4 no existe todavía, muestra un placeholder con la glosa. */
export default function SignVideo({ sign, className }: { sign: Sign; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 ${className ?? ""}`} style={{ aspectRatio: "4 / 3" }}>
      {!missing ? (
        <video src={sign.video} autoPlay loop muted playsInline className="h-full w-full object-cover" onError={() => setMissing(true)} />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <div className="text-center">
            <div className="text-7xl font-black">{sign.glosa}</div>
            <div className="mt-2 text-sm opacity-80">Video pendiente: public{sign.video}</div>
          </div>
        </div>
      )}
    </div>
  );
}
