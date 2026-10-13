"use client";
import { useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { getHandLandmarker, drawLandmarks } from "@/lib/hand";

type Props = {
  active: boolean;
  onFrame?: (result: HandLandmarkerResult, ts: number) => void;
  onError?: (msg: string) => void;
  onReady?: () => void;
  color?: string;
  className?: string;
};

/** Cámara frontal espejada con los 21 puntos de la mano dibujados encima. Todo corre en el navegador. */
export default function HandCamera({ active, onFrame, onError, onReady, color, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(onFrame); cbRef.current = onFrame;
  const colorRef = useRef(color); colorRef.current = color;
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");

  useEffect(() => {
    if (!active) return;
    let raf = 0, stream: MediaStream | null = null, stopped = false, lastTs = -1;
    setStatus("loading");
    (async () => {
      try {
        const [lm, s] = await Promise.all([
          getHandLandmarker(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }),
        ]);
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        const v = videoRef.current!; v.srcObject = s; await v.play();
        setStatus("running"); onReady?.();
        const loop = () => {
          if (stopped) return;
          const c = canvasRef.current;
          if (v.readyState >= 2 && c) {
            if (c.width !== v.videoWidth || c.height !== v.videoHeight) { c.width = v.videoWidth; c.height = v.videoHeight; }
            const ts = performance.now();
            if (ts !== lastTs) {
              lastTs = ts;
              const res = lm.detectForVideo(v, ts);
              const ctx = c.getContext("2d")!;
              ctx.clearRect(0, 0, c.width, c.height);
              drawLandmarks(ctx, res, c.width, c.height, colorRef.current);
              cbRef.current?.(res, ts);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        setStatus("error");
        const msg = e instanceof Error ? e.message : "";
        if (/NotAllowed|Permission/i.test(msg)) onError?.("No se dio permiso para usar la cámara. Revisá el candado de la barra de direcciones.");
        else if (/NotFound|DevicesNotFound/i.test(msg)) onError?.("No se encontró ninguna cámara.");
        else if (/NotReadable|TrackStart/i.test(msg)) onError?.("La cámara está en uso por otra app (Zoom, Teams, Meet). Cerrala y recargá.");
        else onError?.("No se pudo cargar el modelo de manos. Revisá la conexión o corré `npm run get-model`." + (msg ? ` (${msg})` : ""));
      }
    })();
    return () => {
      stopped = true; cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
      const v = videoRef.current; if (v) v.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 ${className ?? ""}`} style={{ aspectRatio: "4 / 3" }}>
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Cargando cámara y modelo…</div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">No se pudo abrir la cámara.</div>
      )}
    </div>
  );
}
