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
import { evaluateA } from "@/lib/letter-a";
import { BuenasTardesTracker } from "@/lib/buenas-tardes";
import { evaluateB } from "@/lib/letter-b";
import { evaluateC } from "@/lib/letter-c";
import { AdiosTracker, parseAdios, wristAnchor, type AdiosReference } from "@/lib/adios";
import type { BodyFrame } from "@/lib/body-tracking";
import { BODY_EVALUATED_IDS, CAMERA_EVALUATED_IDS, HumanEvaluator, observeHuman, parseHumanReference, type HumanReference } from "@/lib/human-evaluator";
import { MovementTracker, observeMovement, parseMovementReference, type MovementReference, type MovementCheck } from "@/lib/movement-check";
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
  const bodyFrame = useRef<BodyFrame | null>(null);
  const adios = useRef(new AdiosTracker());
  const adiosReference = useRef<AdiosReference | null>(null);
  const [sequenceReady, setSequenceReady] = useState(false);
  const human = useRef(new HumanEvaluator());
  const buenasTardes = useRef(new BuenasTardesTracker());
  const humanReference = useRef<HumanReference | null>(null);
  const movement = useRef(new MovementTracker());
  const movementReference = useRef<MovementReference | null>(null);
  const [movementCheck, setMovementCheck] = useState<MovementCheck | null>(null);
  const partial = id === "mucho-gusto";
  const feedbackOnly = partial || id === "gracias";
  const dynamic = ["adios", "hola", "gracias", "buenas-tardes"].includes(id);
  const evaluable = CAMERA_EVALUATED_IDS.includes(id);
  const requiredIds = STATIC_SIGN_IDS.includes(id) ? [id] : [];
  const missing = requiredIds.filter(sid => !sets?.some(s => s.signId === sid && s.samples.length >= MIN_SAMPLES));
  const ready = id === "adios" || BODY_EVALUATED_IDS.includes(id) || partial ? sequenceReady : evaluable && sets !== null && missing.length === 0;

  useEffect(() => {
    let cancelled = false;
    if (feedbackOnly) {
      fetch(`/evaluation/${id}-movement.json`).then(r => r.ok ? r.json() : null).then(value => {
        if (cancelled) return;
        movementReference.current = parseMovementReference(value, id);
        setSequenceReady(!!movementReference.current); setSets([]);
        if (!movementReference.current) setError("No se pudo cargar la comprobación. Recargá la página.");
      }).catch(() => { if (!cancelled) setError("No se pudo cargar la referencia. Revisá la conexión."); });
    } else if (BODY_EVALUATED_IDS.includes(id)) {
      fetch(`/evaluation/${id}.json`).then(r => r.ok ? r.json() : null).then(value => {
        if (cancelled) return;
        humanReference.current = parseHumanReference(value, id);
        const loaded = !!humanReference.current;
        setSequenceReady(loaded); setSets([]);
        if (!loaded) setError("No se pudo cargar una referencia compatible. Recargá la página.");
      }).catch(() => { if (!cancelled) setError("No se pudo cargar la referencia. Revisá la conexión."); });
    } else if (id === "adios") {
      fetch("/evaluation/adios.json").then(r => r.ok ? r.json() : null).then(value => {
        if (cancelled) return;
        adiosReference.current = parseAdios(value); setSequenceReady(!!adiosReference.current); setSets([]);
        if (!adiosReference.current) setError("No se pudo cargar la referencia de ADIÓS. Recargá la página.");
      }).catch(() => { if (!cancelled) { setSets([]); setError("No se pudo cargar la referencia de ADIÓS. Revisá la conexión."); } });
    } else if (evaluable) Promise.all((STATIC_SIGN_IDS.includes(id) ? [id] : STATIC_SIGN_IDS).map(loadSamples)).then(results => {
      if (cancelled) return;
      const loaded = results.filter((s): s is SampleSet => s !== null);
      setsRef.current = loaded; setSets(loaded);
    });
    return () => { cancelled = true; };
  }, [evaluable, id, partial, feedbackOnly]);

  const finish = useCallback((s: number) => {
    if (masteredRef.current) return;
    masteredRef.current = true;
    setFinalScore(s); setSeconds(Math.max(1, Math.round((performance.now() - startedAt.current) / 1000)));
    setMastered(true);
    recordAttempt(id, s).then(setResult);
  }, [id, recordAttempt]);

  const onFrame = useCallback((res: HandLandmarkerResult, ts: number) => {
    if (masteredRef.current) return;
    if (feedbackOnly) {
      const observation = observeMovement(bodyFrame.current, ts);
      const check = movement.current.update(observation, movementReference.current);
      setMovementCheck(check); setHandVisible(!!observation); setScore(check.similarity); setFeedback(check.feedback);
      return; // A body check must not record full sign mastery or award XP.
    }
    const vec = normalize(res);
    setHandVisible(BODY_EVALUATED_IDS.includes(id) || partial ? res.landmarks.length > 0 : evaluable ? !!vec : res.landmarks.length > 0);
    const prediction = vec && evaluable ? classify(vec, setsRef.current, STATIC_SIGN_IDS) : null;
    const body = bodyFrame.current;
    const anchor = id === "adios" && body && ts - body.timestamp <= 300 ? wristAnchor(res.landmarks[0]?.[0], body.pose.landmarks[0], res.handedness[0]?.[0]?.categoryName) : null;
    const aCheck = id === "a" ? evaluateA(vec, setsRef.current.find(s => s.signId === "a"))
      : id === "b" ? evaluateB(vec, setsRef.current.find(s => s.signId === "b"))
      : id === "c" ? evaluateC(vec, setsRef.current.find(s => s.signId === "c"))
      : id === "adios" ? adios.current.update(vec, anchor, ts, adiosReference.current)
      : id === "buenas-tardes" ? buenasTardes.current.update(observeHuman(res, body, ts, 1), humanReference.current)
      : BODY_EVALUATED_IDS.includes(id) ? human.current.update(observeHuman(res, body, ts, humanReference.current?.requiredHands ?? (id === "gracias" ? 2 : 1)), humanReference.current, ts)
      : null;
    const accepted = aCheck ? aCheck.accepted && aCheck.similarity >= THRESHOLD : prediction?.signId === id && prediction.similarity >= THRESHOLD;
    const similarity = aCheck ? aCheck.similarity : accepted ? prediction!.similarity : 0;
    setScore(similarity);
    setBest(b => Math.max(b, similarity));
    setFeedback(aCheck ? aCheck.feedback : !vec ? "Mostrá una sola mano completa, con buena luz."
      : prediction && prediction.signId !== id ? `Se parece más a ${getSign(prediction.signId)?.glosa}. Revisá la referencia.`
      : accepted ? "¡Sostenela un segundo!"
      : "No reconocida con suficiente claridad. Revisá la forma y orientación de la mano.");
    const done = id === "adios" || humanReference.current?.mode === "sequence" ? accepted : hold.current.update(accepted, ts);
    setHoldMs(accepted ? Math.min(HOLD_MS, hold.current.held()) : 0);
    if (done) finish(similarity);
  }, [finish, id, evaluable, partial, feedbackOnly]);

  if (!sign) return <div className="mx-auto max-w-3xl p-margin"><p>Seña no encontrada.</p><Link href="/app" className="text-primary underline">Volver al panel</Link></div>;

  const reset = () => { hold.current.reset(); adios.current.reset(); human.current.reset(); buenasTardes.current.reset(); movement.current.reset(); setMovementCheck(null); bodyFrame.current = null; setScore(0); setHoldMs(0); setError(null); };
  const activate = () => { startedAt.current = performance.now(); setConsent(true); };
  const retry = () => { masteredRef.current = false; setMastered(false); setResult(null); reset(); startedAt.current = performance.now(); };
  const accepted = feedbackOnly ? movementCheck?.verified === true : score >= THRESHOLD;
  const holdPct = Math.round((holdMs / HOLD_MS) * 100);

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[420px] w-full overflow-hidden bg-inverse-surface">
      {!consent && (
        <div className="absolute inset-0 bg-gradient-to-br from-inverse-surface via-primary to-primary-container opacity-90">
          <div className="grid h-full place-items-center pb-40"><Icon name="sign_language" className="text-[120px] text-white/20" /></div>
        </div>
      )}
      {consent && <HandCamera fill trackBody active={consent && !mastered} onBodyFrame={frame => { bodyFrame.current = frame; }} onFrame={onFrame} onError={setError} showLandmarks={showPoints} color={accepted ? "#62df7d" : "#4f8dff"} />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />

      {/* Barra superior */}
      <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2 md:inset-x-space-md md:top-space-md">
        <div className="flex min-w-0 items-center gap-2 md:gap-space-sm">
          <Link href={`/app/sena/${sign.id}`} className="inline-flex h-11 items-center gap-space-xs rounded-full bg-surface/85 px-space-md font-label-md text-label-md text-on-surface backdrop-blur-md hover:bg-surface"><Icon name="arrow_back" className="text-lg" /> Salir</Link>
          {consent && <span className="hidden items-center gap-space-xs rounded-full bg-primary-container/90 md:inline-flex px-space-md py-space-xs font-label-sm text-label-sm uppercase text-on-primary backdrop-blur-md"><span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed-dim" /> Cámara activa</span>}
          <span className="rounded-full bg-surface/85 px-space-md py-space-xs font-label-md text-label-md backdrop-blur-md">{sign.glosa}</span>
        </div>
        {consent && (
          <div className="flex shrink-0 items-center rounded-full bg-surface/85 p-1 backdrop-blur-md">
            <button onClick={() => setShowPoints(v => !v)} aria-pressed={showPoints} aria-label="Mostrar u ocultar las máscaras de cara, brazos y manos" title="Máscaras de cara, brazos y manos" className={`grid h-11 w-11 place-items-center rounded-full ${showPoints ? "bg-primary-fixed text-primary" : "text-on-surface-variant hover:bg-surface-container"}`}><Icon name="hub" /></button>
            <button onClick={() => { setConsent(false); reset(); }} aria-label="Desactivar cámara" title="Desactivar cámara" className="grid h-11 w-11 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"><Icon name="videocam_off" /></button>
          </div>
        )}
      </div>

      {/* Avisos */}
      <div className="absolute left-3 right-36 top-[76px] z-20 mx-auto flex max-h-[25dvh] max-w-2xl flex-col gap-2 overflow-y-auto md:inset-x-space-md md:top-20 md:max-h-none">
        {error && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">{error}</p>}
        {!evaluable && <p className="rounded-xl bg-tertiary-fixed/95 px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed backdrop-blur-md">
          {partial ? "Comprobamos contacto y altura con cámara. Los dedos ocultos no se califican ni se marca la seña dominada." : feedbackOnly ? "Comprobamos el recorrido de ambas manos. La forma de los dedos sigue pendiente de revisión." : "Evaluación pendiente: faltan referencias compatibles de esta seña. Podés ensayarla sin calificación."}</p>}
        {evaluable && !ready && requiredIds.length > 0 && <p className="rounded-xl bg-tertiary-fixed/95 px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed backdrop-blur-md">
          {sets === null ? "Cargando referencias…" : `Faltan referencias compatibles de ${missing.map(m => m.toUpperCase()).join(", ")}. La evaluación estará disponible al completar estas referencias.`}
          {sets !== null && <Link href={`/capture?sign=${sign.id}`} className="ml-2 font-bold underline">Preparar referencias</Link>}
        </p>}
      </div>

      {/* Tarjeta de similitud */}
      {consent && (
        <div className="absolute inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 md:inset-x-auto md:bottom-auto md:left-space-md md:top-1/3 md:w-[380px]">
          <div className="rounded-2xl border border-white/60 bg-surface-container-lowest/95 p-3 shadow-xl md:p-5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div className={`flex min-w-0 items-center gap-2 text-sm font-semibold ${accepted ? "text-secondary" : "text-on-surface-variant"}`}>
                <Icon name={accepted ? "verified" : handVisible ? "search" : "front_hand"} fill={accepted} className="shrink-0 text-xl" />
                <span>{feedbackOnly ? (accepted ? (partial ? "Contacto comprobado" : "Recorrido comprobado") : partial ? "Comprobá el contacto" : "Comprobá el recorrido") : !ready ? "Práctica guiada" : accepted ? "¡Muy bien!" : handVisible ? "Ajustá tu seña" : "Mostrá tu mano"}</span>
              </div>
              {ready && <span className={`shrink-0 text-2xl font-bold tabular-nums leading-none ${accepted ? "text-secondary" : "text-primary"}`}>{score}%</span>}
            </div>
            {ready && <div role="progressbar" aria-label={feedbackOnly ? (partial ? "Progreso del contacto sostenido" : "Coincidencia del recorrido") : "Similitud con la referencia"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="mt-3 h-2 md:mt-4 overflow-hidden rounded-full bg-surface-container-high">
              <div className={`h-full rounded-full transition-all duration-200 ${accepted ? "bg-secondary" : "bg-primary"}`} style={{ width: `${score}%` }} />
            </div>}
            <p role="status" className="mt-2 text-sm leading-snug md:mt-3 md:leading-relaxed text-on-surface">{ready ? feedback : "Ensayá con la cámara y comparala con el avatar."}</p>
            {ready && feedbackOnly && movementCheck && <ul aria-label="Comprobaciones de cámara" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {movementCheck.checks.map(check => <li key={check.label} className={`flex items-start gap-1 ${check.ok ? "text-secondary" : "text-on-surface-variant"}`}><Icon name={check.ok ? "check_circle" : "radio_button_unchecked"} className="shrink-0 text-sm" /><span>{check.label}</span></li>)}
            </ul>}
            {ready && !feedbackOnly && <div className="mt-2 flex items-center justify-between gap-2 border-t border-outline-variant/40 pt-2 md:mt-3 md:pt-3 text-xs text-on-surface-variant">
              <span title="Comparación con las muestras de referencia; no es una probabilidad de acierto.">Similitud con la referencia</span>
              <span className="shrink-0 tabular-nums">Mejor: {best}%</span>
            </div>}
          </div>
        </div>
      )}

      {/* Video de referencia + consejo */}
      <div className="absolute right-3 top-[76px] z-10 flex w-28 flex-col gap-2 md:right-space-md md:top-24 md:w-72">
        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest/95 shadow-xl backdrop-blur-md">
          <button onClick={() => setRefOpen(o => !o)} aria-expanded={refOpen} className="flex min-h-11 w-full items-center justify-between gap-1 bg-inverse-surface/80 px-2 py-2 font-label-sm text-label-sm text-white">
            <span className="flex items-center gap-1"><Icon name="visibility" className="text-sm" /> <span className="md:hidden">Avatar</span><span className="hidden md:inline">Avatar de referencia</span></span><Icon name={refOpen ? "expand_less" : "expand_more"} className="text-base" />
          </button>
          {refOpen && <SignVideo sign={sign} className="!rounded-none" />}
        </div>
        <div className="hidden items-start gap-space-sm rounded-xl bg-surface-container-lowest/95 p-space-sm shadow-lg backdrop-blur-md md:flex">
          <Icon name="lightbulb" className="text-lg text-tertiary" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">¿No agarra tu mano? <b className="text-on-surface">Mejorá la luz</b> o ponela a unos 40 cm de la cámara.</p>
        </div>
      </div>

      {/* Pie: permiso o barra de progreso */}
      <div className="absolute inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-3xl md:inset-x-space-md md:bottom-space-md">
        {!consent ? (
          <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-2xl md:flex-row md:items-center">
            <div className="hidden h-12 w-12 shrink-0 md:grid place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="shield" fill /></div>
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
          <div className={`relative overflow-hidden rounded-2xl px-3 py-3 shadow-2xl md:rounded-full md:px-space-lg md:py-space-md ${accepted ? "bg-secondary text-on-secondary" : "bg-primary-container text-on-primary"}`}>
            <div className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-150" style={{ width: `${holdPct}%` }} />
            <div className="relative flex items-center justify-between gap-space-sm">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold md:font-label-lg md:text-label-lg"><Icon name={accepted ? "thumb_up" : "pan_tool"} fill /> {accepted ? (feedbackOnly ? "Comprobación completada" : "¡Sostenela! Vas súper bien") : partial ? "Compará el contacto con la referencia" : ready ? (dynamic ? `Completá el movimiento de ${sign.glosa}` : "Hacé la seña y mantenela quieta") : "Ensayá la seña a tu ritmo"}</span>
              {ready && !dynamic && !feedbackOnly && <span className="shrink-0 rounded-full bg-white/20 px-space-sm py-0.5 font-label-sm text-label-sm">{(holdMs / 1000).toFixed(1)} / {HOLD_MS / 1000}s</span>}
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
