"use client";
import { useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { getHandLandmarker, drawLandmarks } from "@/lib/hand";
import { createBodyTracker, drawBody, type BodyFrame } from "@/lib/body-tracking";

type Props = {
  active: boolean;
  onFrame?: (result: HandLandmarkerResult, ts: number) => void;
  onError?: (msg: string) => void;
  onReady?: () => void;
  color?: string;
  className?: string;
  /** Ocupa todo el contenedor (position absolute) en vez de mantener 4:3. */
  fill?: boolean;
  /** Dibuja los 21 puntos de la mano encima del video. */
  showLandmarks?: boolean;
  trackBody?: boolean;
  onBodyFrame?: (frame: BodyFrame) => void;
  /** Mantiene la cámara abierta pero sin detectar (por ejemplo, con las instrucciones encima). */
  paused?: boolean;
};

/** Cámara frontal espejada con los 21 puntos de la mano dibujados encima. Todo corre en el navegador. */
export default function HandCamera({ active, onFrame, onError, onReady, color, className, fill = false, showLandmarks = true, trackBody = false, onBodyFrame, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(onFrame); cbRef.current = onFrame;
  const colorRef = useRef(color); colorRef.current = color;
  const showRef = useRef(showLandmarks); showRef.current = showLandmarks;
  const bodyCb = useRef(onBodyFrame); bodyCb.current = onBodyFrame;
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const [bodyStatus, setBodyStatus] = useState<"off" | "loading" | "ready" | "error">("off");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");

  useEffect(() => {
    if (!active) return;
    let raf = 0, stream: MediaStream | null = null, stopped = false, lastVideoTime = -1, lastHandTime = -Infinity;
    let body: Awaited<ReturnType<typeof createBodyTracker>> | null = null;
    let bodyFrame: BodyFrame | null = null, lastBodyTime = -Infinity;
    setBodyStatus(trackBody ? "loading" : "off");
    if (trackBody) createBodyTracker().then(tracker => {
      if (stopped) { tracker.close(); return; }
      body = tracker; setBodyStatus("ready");
    }).catch(() => { if (!stopped) setBodyStatus("error"); });
    setStatus("loading");
    (async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('CAMERA_SECURE_CONTEXT');
        // Primero la cámara (así el permiso se pide al toque) y después el modelo.
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false });
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        let lm: Awaited<ReturnType<typeof getHandLandmarker>>;
        try { lm = await getHandLandmarker(); }
        catch (err) { console.error("[HandCamera] modelo", err); throw new Error('MODEL_LOAD'); }
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current!; v.srcObject = s; await v.play();
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        setStatus("running"); onReady?.();
        const loop = () => {
          if (stopped) return;
          const c = canvasRef.current;
          if (pausedRef.current && c) {
            // Libera CPU/GPU para el avatar y borra los puntos viejos.
            if (lastVideoTime !== -1) { c.getContext("2d")!.clearRect(0, 0, c.width, c.height); lastVideoTime = -1; }
          } else if (v.readyState >= 2 && c) {
            if (c.width !== v.videoWidth || c.height !== v.videoHeight) { c.width = v.videoWidth; c.height = v.videoHeight; }
            const ts = performance.now();
            if (v.currentTime !== lastVideoTime && ts - lastHandTime >= 40) {
              lastHandTime = ts;
              lastVideoTime = v.currentTime;
              let res: HandLandmarkerResult;
              try { res = lm.detectForVideo(v, ts); }
              catch { stream?.getTracks().forEach(t => t.stop()); setStatus("error"); onError?.("Se interrumpió la detección. Desactivá y volvé a activar la cámara."); return; }
              const ctx = c.getContext("2d")!;
              ctx.clearRect(0, 0, c.width, c.height);
              if (body && ts - lastBodyTime >= 120) {
                lastBodyTime = ts;
                try { bodyFrame = body.detect(v, ts); bodyCb.current?.(bodyFrame); }
                catch { body.close(); body = null; bodyFrame = null; setBodyStatus("error"); }
              }
              if (showRef.current && bodyFrame && ts - bodyFrame.timestamp < 250) drawBody(ctx, bodyFrame, c.width, c.height);
              if (showRef.current) drawLandmarks(ctx, res, c.width, c.height, colorRef.current);
              cbRef.current?.(res, ts);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        stream?.getTracks().forEach(t => t.stop());
        if (stopped) return;
        setStatus("error");
        console.error("[HandCamera]", e);
        const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
        if (/MODEL_LOAD/.test(msg)) onError?.("La cámara abrió, pero no cargó el modelo de detección. Revisá tu conexión y volvé a activarla.");
        else if (/NotReadable|TrackStart|AbortError/i.test(msg)) onError?.("La cámara está en uso por otra app (Zoom, Teams, Meet) u otra pestaña. Cerrala y recargá.");
        else if (/CAMERA_SECURE_CONTEXT/.test(msg)) onError?.('Para usar la cámara desde el celular, abrí Amanos con HTTPS y permití el acceso a la cámara.');
        else if (/NotAllowed|Permission|SecurityError/i.test(msg)) onError?.("No se dio permiso para usar la cámara. Revisá los permisos del sitio en tu navegador.");
        else if (/NotFound|DevicesNotFound|Overconstrained/i.test(msg)) onError?.("No se encontró ninguna cámara compatible.");
        else onError?.("No se pudo iniciar la cámara y la detección. Revisá la conexión y volvé a activarla.");
      }
    })();
    return () => {
      stopped = true; cancelAnimationFrame(raf);
      body?.close();
      stream?.getTracks().forEach(t => t.stop());
      const v = videoRef.current; if (v) v.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, trackBody]);

  return (
    <div className={`${fill ? "absolute inset-0" : "relative rounded-2xl"} overflow-hidden bg-inverse-surface ${className ?? ""}`} style={fill ? undefined : { aspectRatio: "4 / 3" }}>
      <video ref={videoRef} playsInline muted className={`absolute inset-0 h-full w-full ${fill ? "object-contain md:object-cover" : "object-cover"}`} style={{ transform: "scaleX(-1)" }} />
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${fill ? "object-contain md:object-cover" : "object-cover"}`} style={{ transform: "scaleX(-1)" }} />
      {status === "running" && bodyStatus === "loading" && <p role="status" className="pointer-events-none absolute left-3 top-16 rounded-lg bg-black/65 px-3 py-2 text-xs text-white">Cargando máscara de cara y brazos…</p>}
      {status === "running" && bodyStatus === "error" && <p role="status" className="pointer-events-none absolute left-3 top-16 max-w-[65%] rounded-lg bg-black/65 px-3 py-2 text-xs text-white">No se pudo cargar la máscara de cara y brazos. Las manos siguen activas; apagá y encendé la cámara para reintentar.</p>}
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-inverse-surface/60 text-sm text-white/90"><span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Cargando cámara y modelo…</span></div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">No se pudo abrir la cámara.</div>
      )}
    </div>
  );
}
