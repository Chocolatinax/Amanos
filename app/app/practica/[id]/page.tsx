"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import HandCamera from "@/components/HandCamera";
import ScoreRing from "@/components/ScoreRing";
import SignVideo from "@/components/SignVideo";
import { normalize } from "@/lib/hand";
import { loadSamples, score as scoreVec, Smoother, type SampleSet } from "@/lib/classifier";
import { getSign, SIGNS } from "@/lib/signs";
import { recordScore, THRESHOLD } from "@/lib/progress";

const HOLD_MS = 1000; // tiempo sostenido sobre el umbral para marcar "Dominada"

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sign = getSign(id);
  const next = SIGNS[SIGNS.findIndex(s => s.id === id) + 1];

  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleSet | null | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [handVisible, setHandVisible] = useState(false);
  const [mastered, setMastered] = useState(false);
  const [best, setBest] = useState(0);
  const [fake, setFake] = useState(false);

  const smoother = useRef(new Smoother(8));
  const holdSince = useRef<number | null>(null);
  const samplesRef = useRef<SampleSet | null>(null);
  const masteredRef = useRef(false);
  const fakeRef = useRef(false); fakeRef.current = fake;

  useEffect(() => { loadSamples(id).then(s => { samplesRef.current = s; setSamples(s); }); }, [id]);

  // Plan B: tecla "b" fija el score en 92 si la cámara falla en vivo.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "b" && !e.metaKey && !e.ctrlKey) setFake(f => !f); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const finish = useCallback((s: number) => {
    if (masteredRef.current) return;
    masteredRef.current = true;
    recordScore(id, s);
    setMastered(true);
  }, [id]);

  const onFrame = useCallback((res: HandLandmarkerResult, ts: number) => {
    if (masteredRef.current) return;
    const vec = normalize(res);
    setHandVisible(!!vec);
    let s = 0;
    if (fakeRef.current) s = 92;
    else if (vec && samplesRef.current) s = scoreVec(vec, samplesRef.current);
    const sm = vec || fakeRef.current ? smoother.current.push(s) : (smoother.current.reset(), 0);
    setScore(sm);
    setBest(b => Math.max(b, sm));
    if (sm >= THRESHOLD) {
      if (holdSince.current == null) holdSince.current = ts;
      else if (ts - holdSince.current >= HOLD_MS) finish(sm);
    } else holdSince.current = null;
  }, [finish]);

  if (!sign) return <p>Seña no encontrada.</p>;

  const retry = () => { masteredRef.current = false; setMastered(false); holdSince.current = null; smoother.current.reset(); setScore(0); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <Link href={`/app/sena/${sign.id}`}>← {sign.glosa}</Link>
        <span>Práctica con cámara</span>
      </div>
      <h1 className="text-2xl font-black">Hacé la seña <span className="text-brand-600">{sign.glosa}</span> <span className="text-base font-semibold text-slate-500">({sign.significado})</span></h1>

      {!consent ? (
        <div className="card space-y-3">
          <h2 className="font-bold">Permiso para usar la cámara</h2>
          <p className="text-sm text-slate-600">
            Amanos usa tu cámara para comparar la forma de tu mano con la seña de referencia. El video se procesa en tu dispositivo:
            <b> no se graba ni se envía a ningún servidor</b>. Solo se guarda tu porcentaje.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConsent(true)} className="btn-primary">Activar cámara</button>
            <Link href={`/app/sena/${sign.id}`} className="btn-ghost">Ahora no</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <HandCamera active={consent && !mastered} onFrame={onFrame} onError={setError} color={score >= THRESHOLD ? "#16a34a" : "#2f7cf6"} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {samples === null && !fake && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Sin referencia para esta seña. Grabá muestras en <Link href={`/capture?sign=${sign.id}`} className="underline">/capture</Link> o copiá <code>public/samples/{sign.id}.json</code>.
              </p>
            )}
            {consent && !handVisible && !fake && !mastered && <p className="text-sm text-slate-500">Mostrá tu mano frente a la cámara.</p>}
          </div>
          <div className="card flex flex-col items-center justify-center gap-2 md:w-56">
            <ScoreRing value={score} threshold={THRESHOLD} />
            <div className="text-xs text-slate-500">Mejor: {best}% · meta {THRESHOLD}%</div>
            <div className="text-xs text-slate-400">{score >= THRESHOLD ? "¡Sostenela!" : "Ajustá la forma de la mano"}</div>
            <details className="mt-2 w-full text-xs text-slate-400">
              <summary className="cursor-pointer">Referencia</summary>
              <SignVideo sign={sign} className="mt-2" />
            </details>
          </div>
        </div>
      )}

      {mastered && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-900/60 p-4">
          <div className="card w-full max-w-sm text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="mt-2 text-2xl font-black">¡Seña dominada!</h2>
            <p className="text-slate-600">{sign.glosa} al {score}%</p>
            <div className="mt-5 grid gap-2">
              {next ? <button onClick={() => router.push(`/app/sena/${next.id}`)} className="btn-primary">Siguiente: {next.glosa}</button>
                    : <button onClick={() => router.push("/app")} className="btn-primary">Ver mi progreso</button>}
              <button onClick={retry} className="btn-ghost">Repetir</button>
              <Link href="/app" className="text-sm text-slate-500">Ir al inicio</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
