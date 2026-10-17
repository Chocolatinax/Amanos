"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import HandCamera from "@/components/HandCamera";
import Icon from "@/components/Icon";
import ScoreRing from "@/components/ScoreRing";
import SignVideo from "@/components/SignVideo";
import { normalize } from "@/lib/hand";
import { loadSamples, classify, HoldTracker, MIN_SAMPLES, type SampleSet } from "@/lib/classifier";
import { getSign, SIGNS, STATIC_SIGN_IDS } from "@/lib/signs";
import { THRESHOLD } from "@/lib/progress";
import { useApp } from "@/lib/store";
import type { AttemptResult } from "@/lib/types";

const HOLD_MS = 1000;

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  return <Practice key={id} id={id} />;
}

function Practice({ id }: { id: string }) {
  const router = useRouter();
  const sign = getSign(id);
  const next = SIGNS[SIGNS.findIndex(s => s.id === id) + 1];
  const { recordAttempt, stats } = useApp();

  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<SampleSet[] | null>(null);
  const [feedback, setFeedback] = useState("Mostrá una sola mano completa frente a la cámara.");
  const [score, setScore] = useState(0);
  const [handVisible, setHandVisible] = useState(false);
  const [mastered, setMastered] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [best, setBest] = useState(0);
  const [holdMs, setHoldMs] = useState(0);
  const [showPoints, setShowPoints] = useState(true);
  const [refOpen, setRefOpen] = useState(true);
  const hold = useRef(new HoldTracker());
  const masteredRef = useRef(false);
  const setsRef = useRef<SampleSet[]>([]);
  const startedAt = useRef<number>(0);
  const evaluable = sign?.tipo === "estatica";
  const missing = STATIC_SIGN_IDS.filter(sid => !sets?.some(s => s.signId === sid && s.samples.length >= MIN_SAMPLES));
  const ready = evaluable && sets !== null && missing.length === 0;

  useEffect(() => {
    let cancelled = false;
    if (evaluable) Promise.all(STATIC_SIGN_IDS.map(loadSamples)).then(results => {
      if (cancelled) return;
      const loaded = results.filter((s): s is SampleSet => s !== null);
      setsRef.current = loaded; setSets(loaded);
    });
    return () => { cancelled = true; };
  }, [evaluable]);

  const finish = useCallback((s: number) => {
    if (masteredRef.current) return;
    masteredRef.current = true;
    setFinalScore(s); setSeconds(Math.max(1, Math.round((performance.now() - startedAt.current) / 1000)));
    setMastered(true);
    recordAttempt(id, s).then(setResult);
  }, [id, recordAttempt]);

  const onFrame = useCallback((res: HandLandmarkerResult, ts: number) => {
    if (masteredRef.current) return;
    const vec = normalize(res);
    setHandVisible(evaluable ? !!vec : res.landmarks.length > 0);
    const prediction = vec && evaluable ? classify(vec, setsRef.current, STATIC_SIGN_IDS) : null;
    const accepted = prediction?.signId === id && prediction.similarity >= THRESHOLD;
    const similarity = accepted ? prediction.similarity : 0;
    setScore(similarity);
    setBest(b => Math.max(b, similarity));
    setFeedback(!vec ? "Mostrá una sola mano completa, con buena luz."
      : prediction && prediction.signId !== id ? `Se parece más a ${getSign(prediction.signId)?.glosa}. Revisá la referencia.`
      : accepted ? "¡Sostenela un segundo!"
      : "No reconocida con suficiente claridad. Revisá la forma y orientación de la mano.");
    const done = hold.current.update(accepted, ts);
    setHoldMs(accepted ? Math.min(HOLD_MS, hold.current.held()) : 0);
    if (done) finish(similarity);
  }, [finish, id, evaluable]);

  if (!sign) return <div className="mx-auto max-w-3xl p-margin"><p>Seña no encontrada.</p><Link href="/app" className="text-primary underline">Volver al panel</Link></div>;

  const reset = () => { hold.current.reset(); setScore(0); setHoldMs(0); setError(null); };
  const activate = () => { startedAt.current = performance.now(); setConsent(true); };
  const retry = () => { masteredRef.current = false; setMastered(false); setResult(null); reset(); startedAt.current = performance.now(); };
  const accepted = score >= THRESHOLD;
  const holdPct = Math.round((holdMs / HOLD_MS) * 100);

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[560px] w-full overflow-hidden bg-inverse-surface">
      {!consent && (
        <div className="absolute inset-0 bg-gradient-to-br from-inverse-surface via-primary to-primary-container opacity-90">
          <div className="grid h-full place-items-center pb-40"><Icon name="sign_language" className="text-[120px] text-white/20" /></div>
        </div>
      )}
      {consent && <HandCamera fill active={consent && !mastered} onFrame={onFrame} onError={setError} showLandmarks={showPoints} color={accepted ? "#62df7d" : "#4f8dff"} />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />

      {/* Barra superior */}
      <div className="absolute left-space-md right-space-md top-space-md z-10 flex items-start justify-between gap-space-sm">
        <div className="flex flex-wrap items-center gap-space-sm">
          <Link href={`/app/sena/${sign.id}`} className="inline-flex h-11 items-center gap-space-xs rounded-full bg-surface/85 px-space-md font-label-md text-label-md text-on-surface backdrop-blur-md hover:bg-surface"><Icon name="arrow_back" className="text-lg" /> Salir</Link>
          {consent && <span className="inline-flex items-center gap-space-xs rounded-full bg-primary-container/90 px-space-md py-space-xs font-label-sm text-label-sm uppercase text-on-primary backdrop-blur-md"><span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed-dim" /> Cámara activa</span>}
          <span className="rounded-full bg-surface/85 px-space-md py-space-xs font-label-md text-label-md backdrop-blur-md">{sign.glosa}</span>
        </div>
        {consent && (
          <div className="flex items-center gap-space-xs rounded-full bg-surface/85 p-space-xs backdrop-blur-md">
            <button onClick={() => setShowPoints(v => !v)} aria-pressed={showPoints} aria-label="Mostrar u ocultar los puntos de la mano" title="Puntos de la mano" className={`grid h-10 w-10 place-items-center rounded-full ${showPoints ? "bg-primary-fixed text-primary" : "text-on-surface-variant hover:bg-surface-container"}`}><Icon name="hub" /></button>
            <button onClick={() => { setConsent(false); reset(); }} aria-label="Desactivar cámara" title="Desactivar cámara" className="grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"><Icon name="videocam_off" /></button>
          </div>
        )}
      </div>

      {/* Avisos */}
      <div className="absolute inset-x-space-md top-20 z-10 mx-auto flex max-w-2xl flex-col gap-space-sm">
        {error && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">{error}</p>}
        {!evaluable && <p className="rounded-xl bg-tertiary-fixed/95 px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed backdrop-blur-md">
          Práctica guiada: esta seña requiere {sign.tipo === "dinamica" ? "evaluar el movimiento completo" : "evaluar la ubicación respecto al cuerpo"}. Podés ensayarla, pero todavía no se califica ni se marca dominada.</p>}
        {evaluable && !ready && <p className="rounded-xl bg-tertiary-fixed/95 px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed backdrop-blur-md">
          {sets === null ? "Cargando referencias…" : `Faltan referencias compatibles de ${missing.map(m => m.toUpperCase()).join(", ")}. La evaluación estará disponible al completar A, B y C.`}
          {sets !== null && <Link href={`/capture?sign=${sign.id}`} className="ml-2 font-bold underline">Preparar referencias</Link>}
        </p>}
      </div>

      {/* Tarjeta de similitud */}
      {consent && (
        <div className="absolute bottom-32 left-space-md z-10 w-[min(88vw,380px)] sm:bottom-auto sm:top-1/3">
          <div className="flex items-center gap-space-md rounded-2xl bg-surface-container-lowest/95 p-space-md shadow-xl backdrop-blur-md">
            {ready ? <ScoreRing value={score} size={92} threshold={THRESHOLD} label="similitud" stroke={8} />
              : <div className="grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant"><Icon name="school" className="text-4xl" /></div>}
            <div className="min-w-0">
              <div className={`flex items-center gap-1 font-label-sm text-label-sm uppercase ${accepted ? "text-secondary" : "text-on-surface-variant"}`}>
                <Icon name={accepted ? "verified" : handVisible ? "search" : "front_hand"} fill={accepted} className="text-base" />
                {!ready ? "Sin calificación" : accepted ? "¡Excelente!" : handVisible ? "Buscando la seña…" : "Esperando tu mano…"}
              </div>
              <p role="status" className="mt-0.5 font-body-sm text-body-sm text-on-surface">{ready ? feedback : "Ensayá con la cámara y comparala con el video de referencia."}</p>
              {ready && <p className="mt-0.5 font-label-sm text-xs text-on-surface-variant">Mejor: {best}% · Es similitud con referencias, no una probabilidad de acierto.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Video de referencia + consejo */}
      <div className="absolute right-space-md top-20 z-10 flex w-44 flex-col gap-space-sm sm:top-24 sm:w-72">
        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest/95 shadow-xl backdrop-blur-md">
          <button onClick={() => setRefOpen(o => !o)} aria-expanded={refOpen} className="flex w-full items-center justify-between bg-inverse-surface/80 px-space-sm py-space-xs font-label-sm text-label-sm text-white">
            <span className="flex items-center gap-1"><Icon name="visibility" className="text-sm" /> Referencia en video</span><Icon name={refOpen ? "expand_less" : "expand_more"} className="text-base" />
          </button>
          {refOpen && <SignVideo sign={sign} className="!rounded-none" />}
        </div>
        <div className="hidden items-start gap-space-sm rounded-xl bg-surface-container-lowest/95 p-space-sm shadow-lg backdrop-blur-md sm:flex">
          <Icon name="lightbulb" className="text-lg text-tertiary" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">¿No agarra tu mano? <b className="text-on-surface">Mejorá la luz</b> o ponela a unos 40 cm de la cámara.</p>
        </div>
      </div>

      {/* Pie: permiso o barra de progreso */}
      <div className="absolute inset-x-space-md bottom-space-md z-10 mx-auto max-w-3xl">
        {!consent ? (
          <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-2xl sm:flex-row sm:items-center">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="shield" fill /></div>
            <div className="flex-1">
              <h1 className="font-headline-sm text-headline-sm">Hacé la seña “{sign.glosa}” frente a tu cámara</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Tu video se procesa en tu dispositivo con el modelo local. <b className="text-on-surface">No se graba ni se envía a ningún servidor</b>; solo se guarda tu porcentaje.</p>
            </div>
            <div className="flex items-center gap-space-sm">
              <Link href={`/app/sena/${sign.id}`} className="px-space-sm font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Ahora no</Link>
              <button onClick={activate} className="btn-push-success">Activar cámara</button>
            </div>
          </div>
        ) : (
          <div className={`relative overflow-hidden rounded-full px-space-lg py-space-md shadow-2xl ${accepted ? "bg-secondary text-on-secondary" : "bg-primary-container text-on-primary"}`}>
            <div className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-150" style={{ width: `${holdPct}%` }} />
            <div className="relative flex items-center justify-between gap-space-sm">
              <span className="flex items-center gap-space-sm font-label-lg text-label-lg"><Icon name={accepted ? "thumb_up" : "pan_tool"} fill /> {accepted ? "¡Sostenela! Vas súper bien" : ready ? "Hacé la seña y mantenela quieta" : "Ensayá la seña a tu ritmo"}</span>
              {ready && <span className="rounded-full bg-white/20 px-space-sm py-0.5 font-label-sm text-label-sm">{(holdMs / 1000).toFixed(1)} / {HOLD_MS / 1000}s</span>}
            </div>
          </div>
        )}
      </div>

      {/* Seña dominada */}
      {mastered && <MasteredModal signGlosa={sign.glosa} score={finalScore} result={result} seconds={seconds} streak={stats.streak}
        next={next ? { id: next.id, glosa: next.glosa } : null} onRetry={retry} onNext={() => router.push(next ? `/app/sena/${next.id}` : "/app")} onHome={() => router.push("/app")} />}
    </div>
  );
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 37) % 100}%`, delay: `${(i % 6) * 0.15}s`, color: ["#1f63d6", "#7cf994", "#ffb95f", "#b0c6ff"][i % 4] }));

function MasteredModal({ signGlosa, score, result, seconds, streak, next, onRetry, onNext, onHome }: {
  signGlosa: string; score: number; result: AttemptResult | null; seconds: number; streak: number;
  next: { id: string; glosa: string } | null; onRetry: () => void; onNext: () => void; onHome: () => void;
}) {
  const first = result?.newlyMastered;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="mastered-title" className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-inverse-surface/70 p-space-md backdrop-blur-sm">
      <div className="pop relative w-full max-w-md overflow-hidden rounded-3xl bg-surface-container-lowest p-space-lg text-center shadow-[0_24px_60px_-12px_rgba(15,23,42,0.5)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI.map((c, i) => <span key={i} className="confetti" style={{ left: c.left, animationDelay: c.delay, background: c.color }} />)}
        </div>
        <div className="relative">
          <div className="text-3xl" aria-hidden>🎉 🇸🇻 ✨</div>
          <div className="mt-space-sm flex justify-center"><ScoreRing value={score} size={132} threshold={90} label="similitud" /></div>
          <span className="mt-space-sm inline-flex items-center gap-1 rounded-full bg-secondary px-space-sm py-0.5 font-label-sm text-label-sm text-on-secondary"><Icon name="verified" fill className="text-sm" /> ¡Clavada!</span>
          <p className="mt-space-md font-label-sm text-label-sm uppercase tracking-wider text-primary">Lección completada</p>
          <h2 id="mastered-title" className="mt-1 font-headline-lg text-headline-lg text-on-surface">{first === false ? "¡Muy bien! Repasaste la seña" : "¡Bárbaro, vos! ¡Seña dominada!"}</h2>
          <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">Lograste <b className="text-on-surface">{signGlosa}</b> con {score}% de similitud.</p>
          <div className="mt-space-md grid grid-cols-3 gap-space-sm">
            <div className="rounded-xl bg-surface-container-low p-space-sm"><Icon name="bolt" fill className="text-primary" /><div className="font-headline-sm text-headline-sm text-primary">{result ? `+${result.xpGained}` : "…"}</div><div className="font-label-sm text-xs text-on-surface-variant">XP ganada</div></div>
            <div className="rounded-xl bg-surface-container-low p-space-sm"><Icon name="local_fire_department" fill className="text-tertiary" /><div className="font-headline-sm text-headline-sm text-tertiary">{streak} {streak === 1 ? "día" : "días"}</div><div className="font-label-sm text-xs text-on-surface-variant">Racha activa</div></div>
            <div className="rounded-xl bg-surface-container-low p-space-sm"><Icon name="timer" className="text-on-surface-variant" /><div className="font-headline-sm text-headline-sm">{seconds} seg</div><div className="font-label-sm text-xs text-on-surface-variant">Tiempo total</div></div>
          </div>
          <div className="mt-space-lg grid gap-space-sm">
            <button onClick={onNext} className="btn-push-primary w-full">{next ? `Siguiente seña: ${next.glosa}` : "Ver mi progreso"} <Icon name="arrow_forward" /></button>
            <button onClick={onRetry} className="flex h-12 items-center justify-center gap-space-sm rounded-xl bg-primary-fixed font-label-lg text-label-lg text-primary hover:brightness-95">Repetir <Icon name="replay" /></button>
            <button onClick={onHome} className="py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Ir al inicio de lecciones</button>
          </div>
        </div>
      </div>
    </div>
  );
}
