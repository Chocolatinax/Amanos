"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import HandCamera from "@/components/HandCamera";
import { normalize, type Vec } from "@/lib/hand";
import { clearLocalSamples, loadLocalSamples, saveLocalSamples, type SampleSet } from "@/lib/classifier";
import { FEATURE_VERSION } from "@/lib/features";
import { SIGNS, STATIC_SIGN_IDS } from "@/lib/signs";

const TARGET = 20;      // muestras por tanda
const INTERVAL_MS = 150; // separación entre muestras

function Capture() {
  const requested = useSearchParams().get("sign") ?? "a";
  const initial = STATIC_SIGN_IDS.includes(requested) ? requested : "a";
  const [signId, setSignId] = useState(initial);
  const [senante, setSenante] = useState("");
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [buffer, setBuffer] = useState<Vec[]>([]);
  const [set, setSet] = useState<SampleSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); recRef.current = false; }, []);
  const [handVisible, setHandVisible] = useState(false);

  const recRef = useRef(false);
  const lastRef = useRef(0);
  const bufRef = useRef<Vec[]>([]);

  useEffect(() => { setSet(loadLocalSamples(signId)); setBuffer([]); bufRef.current = []; }, [signId]);

  const start = () => {
    let n = 3; setCountdown(n);
    const t = timerRef.current = setInterval(() => {
      n -= 1;
      if (n === 0) { clearInterval(t); setCountdown(null); bufRef.current = []; setBuffer([]); recRef.current = true; setRecording(true); }
      else setCountdown(n);
    }, 1000);
  };

  const onFrame = useCallback((res: HandLandmarkerResult, ts: number) => {
    const vec = normalize(res);
    setHandVisible(!!vec);
    if (!recRef.current || !vec) return;
    if (ts - lastRef.current < INTERVAL_MS) return;
    lastRef.current = ts;
    bufRef.current = [...bufRef.current, vec];
    setBuffer(bufRef.current);
    if (bufRef.current.length >= TARGET) { recRef.current = false; setRecording(false); }
  }, []);

  const save = () => {
    const prev = loadLocalSamples(signId);
    const meta = bufRef.current.map(() => ({ senante: senante || "anon", dispositivo: navigator.userAgent.slice(0, 40), fecha: new Date().toISOString().slice(0, 10) }));
    const merged: SampleSet = { version: FEATURE_VERSION, signId, samples: [...(prev?.samples ?? []), ...bufRef.current], meta: [...(prev?.meta ?? []), ...meta] };
    try { saveLocalSamples(merged); setSet(merged); bufRef.current = []; setBuffer([]); setError(null); }
    catch { setError("No se pudieron guardar las muestras. Revisá el espacio disponible del navegador."); }
  };
  const download = () => {
    if (!set) return;
    const blob = new Blob([JSON.stringify(set)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${signId}.json`; a.click();
  };
  const sign = SIGNS.find(s => s.id === signId)!;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Captura de muestras <span className="text-sm font-normal text-slate-500">(herramienta interna)</span></h1>
        <Link href="/app" className="text-sm text-slate-500">Ir a la app</Link>
      </div>
      <div className="card grid gap-3 md:grid-cols-3">
        <label className="text-sm">Seña
          <select disabled={recording || countdown != null} value={signId} onChange={e => setSignId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
            {SIGNS.filter(s => s.tipo === "estatica").map(s => <option key={s.id} value={s.id}>{s.glosa} · {s.significado}</option>)}
          </select>
        </label>
        <label className="text-sm">Señante
          <input value={senante} onChange={e => setSenante(e.target.value)} placeholder="nombre" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <div className="text-sm">Guardadas en este navegador
          <div className="mt-1 text-2xl font-black">{set?.samples.length ?? 0}</div>
        </div>
      </div>
      <p className="text-sm text-slate-600">Captura de A, B y C. Las señas con movimiento o ubicación requieren otro tipo de referencia. Usá una sola mano y una postura revisada por el equipo LESSA.</p>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <p className="text-sm text-slate-600">{sign.descripcion.configuracionMano}. {sign.descripcion.orientacion}.</p>

      {!active ? (
        <button onClick={() => setActive(true)} className="btn-primary">Activar cámara</button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <HandCamera onError={setError} active={active} onFrame={onFrame} color={recording ? "#ef4444" : "#4977CD"} />
            {countdown != null && <div className="absolute inset-0 grid place-items-center text-8xl font-black text-white drop-shadow">{countdown}</div>}
            {recording && <div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">REC {buffer.length}/{TARGET}</div>}
          </div>
          {!handVisible && <p className="text-sm text-slate-500">Mostrá la mano frente a la cámara.</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={start} disabled={recording || countdown != null} className="btn-primary">Grabar {TARGET} muestras</button>
            <button onClick={save} disabled={buffer.length === 0 || recording} className="btn-ghost">Guardar tanda ({buffer.length})</button>
            <button onClick={download} disabled={!set} className="btn-ghost">Descargar {signId}.json</button>
            <button onClick={() => { clearLocalSamples(signId); setSet(null); }} disabled={!set || recording || countdown != null} className="btn-ghost text-red-600">Borrar</button>
          </div>
          <p className="text-xs text-slate-500">
            Tip: mové un poco la mano (distancia, inclinación) durante la tanda para que las muestras tengan variedad. Grabá 2 o 3 tandas por persona.
            Las muestras guardadas acá ya se usan en la práctica. Para compartirlas con el equipo, descargá el JSON y ponelo en <code>public/samples/</code>.
          </p>
        </div>
      )}
    </main>
  );
}
export default function Page() { return <Suspense><Capture /></Suspense>; }
