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
import { STATIC_SIGN_IDS, type Sign } from "@/lib/signs";
import { useCatalog } from '@/lib/catalog';
import { loadReference } from '@/lib/reference-source';
import { THRESHOLD } from "@/lib/progress";
import { useApp } from "@/lib/store";
import type { AttemptResult } from "@/lib/types";

const HOLD_MS = 1000;
const TIPO = { estatica: "Seña estática", dinamica: "Seña con movimiento", ubicacion: "Estática con ubicación" } as const;
const MOVIMIENTO = {
  estatica: "Seña estática: mantené la mano quieta, sin balanceos.",
  dinamica: "Seña con movimiento: seguí el recorrido que se ve en el avatar, de principio a fin.",
  ubicacion: "Seña estática: lo que importa es dónde se ubica la mano respecto al cuerpo.",
} as const;

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  return <Practice key={id} id={id} />;
}

function Practice({ id }: { id: string }) {
  const router = useRouter();
  const { signs: SIGNS, getSign, getUnit, evaluationEnabled, settings } = useCatalog();
  const evaluationAllowed = evaluationEnabled(id);
  const referenceRevision = settings.find(s => s.id === id)?.revision ?? 0;
  const sign = getSign(id);
  const idx = SIGNS.findIndex(s => s.id === id);
  const prev = idx > 0 ? SIGNS[idx - 1] : undefined, next = SIGNS[idx + 1];
  const { recordAttempt, stats, user, markSeen } = useApp();
  useEffect(() => { if (sign) markSeen(sign.id); }, [sign?.id, markSeen]);

  // La cámara arranca sola; las instrucciones se muestran encima hasta que la persona empieza.
  const [consent, setConsent] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Separado del error de referencias: reactivar la cámara no debe ocultar una referencia que no cargó.
  const [cameraError, setCameraError] = useState<string | null>(null);
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
  useEffect(() => {
    const pause = () => { if (document.hidden) setConsent(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
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
  const feedbackOnly = evaluationAllowed && (partial || id === "gracias");
  const dynamic = ["adios", "hola", "gracias", "buenas-tardes"].includes(id);
  const evaluable = evaluationAllowed && CAMERA_EVALUATED_IDS.includes(id);
  const requiredIds = STATIC_SIGN_IDS.includes(id) ? [id] : [];
  const missing = requiredIds.filter(sid => !sets?.some(s => s.signId === sid && s.samples.length >= MIN_SAMPLES));
  const ready = evaluationAllowed && (id === "adios" || BODY_EVALUATED_IDS.includes(id) || partial ? sequenceReady : evaluable && sets !== null && missing.length === 0);

  useEffect(() => {
    let cancelled = false;
    setsRef.current = []; humanReference.current = null; movementReference.current = null; adiosReference.current = null;
    hold.current.reset(); human.current.reset(); buenasTardes.current.reset(); movement.current.reset(); adios.current.reset();
    setSequenceReady(false); setSets(null); setScore(0);
    if (!evaluationAllowed) return;
    if (feedbackOnly) {
      loadReference(id).then(value => {
        if (cancelled) return;
        movementReference.current = parseMovementReference(value, id);
        setSequenceReady(!!movementReference.current); setSets([]);
        if (!movementReference.current) setError("No se pudo cargar la comprobación. Recargá la página.");
      }).catch(() => { if (!cancelled) setError("No se pudo cargar la referencia. Revisá la conexión."); });
    } else if (BODY_EVALUATED_IDS.includes(id)) {
      loadReference(id).then(value => {
        if (cancelled) return;
        humanReference.current = parseHumanReference(value, id);
        const loaded = !!humanReference.current;
        setSequenceReady(loaded); setSets([]);
        if (!loaded) setError("No se pudo cargar una referencia compatible. Recargá la página.");
      }).catch(() => { if (!cancelled) setError("No se pudo cargar la referencia. Revisá la conexión."); });
    } else if (id === "adios") {
      loadReference(id).then(value => {
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
  }, [evaluable, id, partial, feedbackOnly, evaluationAllowed, referenceRevision]);

  const finish = useCallback((s: number) => {
    if (masteredRef.current) return;
    masteredRef.current = true;
    setFinalScore(s); setSeconds(Math.max(1, Math.round((performance.now() - startedAt.current) / 1000)));
    setMastered(true);
    recordAttempt(id, s).then(setResult);
  }, [id, recordAttempt]);

  const onFrame = useCallback((res: HandLandmarkerResult, ts: number) => {
    if (masteredRef.current) return;
    if (!evaluationAllowed) { setHandVisible(res.landmarks.length > 0); setFeedback('Evaluación pausada. Podés practicar siguiendo el avatar.'); return; }
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
  }, [finish, id, evaluable, partial, feedbackOnly, evaluationAllowed, getSign]);

  if (!sign) return <div className="mx-auto max-w-3xl p-margin"><p>Seña no encontrada.</p><Link href="/app" className="text-primary underline">Volver al panel</Link></div>;

  const resetTrackers = () => { hold.current.reset(); adios.current.reset(); human.current.reset(); buenasTardes.current.reset(); movement.current.reset(); setMovementCheck(null); bodyFrame.current = null; setScore(0); setHoldMs(0); };
  const reset = () => { resetTrackers(); setCameraError(null); };
  const activate = () => { reset(); startedAt.current = performance.now(); setConsent(true); };
  // Conserva errores vigentes (cámara o referencia) y reabre la cámara si se apagó al cambiar de pestaña.
  const closeGuide = () => { if (consent) resetTrackers(); else activate(); startedAt.current = performance.now(); setGuideOpen(false); };
  const retry = () => { masteredRef.current = false; setMastered(false); setResult(null); reset(); startedAt.current = performance.now(); };
  const accepted = feedbackOnly ? movementCheck?.verified === true : score >= THRESHOLD;
  const holdPct = Math.round((holdMs / HOLD_MS) * 100);
  const unitLabel = getUnit(sign.unidadId)?.nombre.replace(/^Unidad \d+: /, "");

  return (
    <div className="practice-screen relative h-dvh min-h-[420px] w-full overflow-hidden bg-inverse-surface" data-active={consent}>
      <div className="practice-camera absolute inset-0">
      {!consent && (
        <div className="absolute inset-0 bg-gradient-to-br from-inverse-surface via-brand-700 to-primary-container opacity-90">
          <div className="grid h-full place-items-center pb-40"><Icon name="sign_language" className="text-[120px] text-white/20" /></div>
        </div>
      )}
      {consent && <HandCamera fill trackBody active={consent && !mastered} paused={guideOpen} onBodyFrame={frame => { bodyFrame.current = frame; }} onFrame={onFrame} onError={setCameraError} showLandmarks={showPoints} color={accepted ? "#62df7d" : "#4f8dff"} />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />
      </div>

      {/* Barra superior */}
      <div className="practice-toolbar absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2 md:inset-x-space-md md:top-space-md">
        <div className="flex min-w-0 items-center gap-2 md:gap-space-sm">
          <Link href={`/app/unidad/${sign.unidadId}`} className="inline-flex h-11 items-center gap-space-xs rounded-full bg-surface/85 px-space-md font-label-md text-label-md text-on-surface backdrop-blur-md hover:bg-surface"><Icon name="arrow_back" className="text-lg" /> Salir</Link>
          {consent && <span className="hidden items-center gap-space-xs rounded-full bg-primary-container/90 md:inline-flex px-space-md py-space-xs font-label-sm text-label-sm uppercase text-on-primary backdrop-blur-md"><span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed-dim" /> Cámara activa</span>}
          <span className="min-w-0 truncate rounded-full bg-surface/85 px-space-md py-space-xs font-label-md text-label-md backdrop-blur-md">{sign.glosa}</span>
        </div>
        <div className="flex shrink-0 items-center rounded-full bg-surface/85 p-1 backdrop-blur-md">
          <button onClick={() => setGuideOpen(true)} aria-label="Ver instrucciones de la seña" title="Instrucciones" className="grid h-11 w-11 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"><Icon name="menu_book" /></button>
          {consent && <>
            <button onClick={() => setShowPoints(v => !v)} aria-pressed={showPoints} aria-label="Mostrar u ocultar las máscaras de cara, brazos y manos" title="Máscaras de cara, brazos y manos" className={`grid h-11 w-11 place-items-center rounded-full ${showPoints ? "bg-primary-fixed text-primary" : "text-on-surface-variant hover:bg-surface-container"}`}><Icon name="hub" /></button>
            <button onClick={() => { setConsent(false); reset(); }} aria-label="Desactivar cámara" title="Desactivar cámara" className="grid h-11 w-11 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"><Icon name="videocam_off" /></button>
          </>}
        </div>
      </div>

      {/* Avisos */}
      <div className="practice-notices absolute left-3 right-36 top-[76px] z-20 mx-auto flex max-h-[25dvh] max-w-2xl flex-col gap-2 overflow-y-auto md:inset-x-space-md md:top-20 md:max-h-none">
        {[cameraError, error].filter(Boolean).map(msg => <p key={msg} role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">{msg}</p>)}
        {!evaluable && <p className="rounded-xl bg-tertiary-fixed/95 px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed backdrop-blur-md">
          {!evaluationAllowed ? 'La evaluación de esta seña está pausada. Podés ensayarla con el avatar.' : partial ? "Comprobamos contacto y altura con cámara. Los dedos ocultos no se califican ni se marca la seña dominada." : feedbackOnly ? "Comprobamos el recorrido de ambas manos. La forma de los dedos sigue pendiente de revisión." : "Evaluación pendiente: faltan referencias compatibles de esta seña. Podés ensayarla sin calificación."}</p>}
        {evaluable && !ready && requiredIds.length > 0 && <p className="rounded-xl bg-tertiary-fixed/95 px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed backdrop-blur-md">
          {sets === null ? "Cargando referencias…" : `Faltan referencias compatibles de ${missing.map(m => m.toUpperCase()).join(", ")}. La evaluación estará disponible al completar estas referencias.`}
          {sets !== null && user?.isAdmin && <Link href="/app/admin" className="ml-2 font-bold underline">Revisar referencias</Link>}
        </p>}
      </div>

      {/* Tarjeta de similitud */}
      {consent && (
        <div className="practice-feedback absolute inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 md:inset-x-auto md:bottom-auto md:left-space-md md:top-1/3 md:w-[380px]">
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
      {/* Mientras la guía está abierta el avatar vive ahí: un solo visor 3D a la vez. */}
      {!guideOpen && <div className="practice-reference absolute right-3 top-[76px] z-10 flex w-28 flex-col gap-2 md:right-space-md md:top-24 md:w-72">
        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest/95 shadow-xl backdrop-blur-md">
          <button onClick={() => setRefOpen(o => !o)} aria-expanded={refOpen} className="flex min-h-11 w-full items-center justify-between gap-1 bg-inverse-surface/80 px-2 py-2 font-label-sm text-label-sm text-white">
            <span className="flex items-center gap-1"><Icon name="visibility" className="text-sm" /> <span className="md:hidden">Avatar</span><span className="hidden md:inline">Avatar de referencia</span></span><Icon name={refOpen ? "expand_less" : "expand_more"} className="text-base" />
          </button>
          {refOpen && <SignVideo sign={sign} className="!rounded-none" />}
          <button onClick={() => setGuideOpen(true)} className="min-h-11 w-full bg-primary-fixed px-2 text-xs font-semibold text-primary md:hidden">Ver más grande</button>
        </div>
        <div className="hidden items-start gap-space-sm rounded-xl bg-surface-container-lowest/95 p-space-sm shadow-lg backdrop-blur-md md:flex">
          <Icon name="lightbulb" className="text-lg text-tertiary" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">¿No agarra tu mano? <b className="text-on-surface">Mejorá la luz</b> o ponela a unos 40 cm de la cámara.</p>
        </div>
      </div>}

      {/* Pie: permiso o barra de progreso */}
      <div className="practice-footer absolute inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-3xl md:inset-x-space-md md:bottom-space-md">
        {!consent ? (
          <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-2xl md:flex-row md:items-center">
            <div className="hidden h-12 w-12 shrink-0 md:grid place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="shield" fill /></div>
            <div className="flex-1">
              <h2 className="font-headline-sm text-headline-sm">La cámara está apagada</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Tu video se procesa en tu dispositivo con el modelo local. <b className="text-on-surface">No se graba ni se envía a ningún servidor</b>; solo se guarda tu porcentaje.</p>
            </div>
            <div className="flex items-center gap-space-sm">
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

      {guideOpen && !mastered && <GuideModal sign={sign} unitLabel={unitLabel} evaluable={evaluable} feedbackOnly={feedbackOnly} evaluationAllowed={evaluationAllowed} prev={prev} next={next} onStart={closeGuide} />}

      {/* Seña dominada */}
      {mastered && <MasteredModal signGlosa={sign.glosa} score={finalScore} result={result} seconds={seconds} streak={stats.streak}
        next={next ? { id: next.id, glosa: next.glosa } : null} onRetry={retry} onNext={() => router.push(next ? `/app/practica/${next.id}` : "/app")} onHome={() => router.push("/app")} />}
    </div>
  );
}

/** Seña e instrucciones en una ventana encima de la cámara; la detección queda en pausa mientras está abierta. */
function GuideModal({ sign, unitLabel, evaluable, feedbackOnly, evaluationAllowed, prev, next, onStart }: {
  sign: Sign; unitLabel?: string; evaluable: boolean; feedbackOnly: boolean; evaluationAllowed: boolean;
  prev?: Sign; next?: Sign; onStart: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const startRef = useRef(onStart); startRef.current = onStart;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Todo lo que queda detrás de la ventana se vuelve inerte (como un <dialog> modal), también para el foco que sale del iframe.
    const overlay = box.current?.parentElement;
    const behind = overlay?.parentElement ? Array.from(overlay.parentElement.children).filter(el => el !== overlay && !el.hasAttribute("inert")) : [];
    behind.forEach(el => el.setAttribute("inert", ""));
    start.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") startRef.current(); };
    // Con el foco dentro del avatar, Escape llega como mensaje del iframe.
    const onMessage = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.type === "amanos-avatar" && e.data.state === "escape") startRef.current(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("keydown", onKey); window.removeEventListener("message", onMessage);
      behind.forEach(el => el.removeAttribute("inert"));
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const steps = [
    { n: "01", icon: "back_hand", title: "Forma de la mano", text: sign.descripcion.configuracionMano },
    { n: "02", icon: "screen_rotation", title: "Orientación", text: sign.descripcion.orientacion },
    { n: "03", icon: "open_with", title: "Movimiento", text: MOVIMIENTO[sign.tipo] },
    { n: "04", icon: "my_location", title: "Ubicación", text: sign.descripcion.ubicacion },
  ];
  const mode = !evaluationAllowed ? "La evaluación de esta seña está pausada. Podés ensayarla siguiendo el avatar."
    : evaluable ? "Se califica con cámara: tu porcentaje es la similitud con las muestras de referencia."
    : feedbackOnly ? (sign.id === "gracias" ? "La cámara comprueba el recorrido de ambas manos. La forma de los dedos aún requiere revisión; no marca la seña como dominada." : "La cámara comprueba la ubicación de las muñecas y el contacto. Los dedos ocultos aún requieren revisión; no marca la seña como dominada.")
    : `Con la cámara podés ensayar esta seña, pero todavía no se califica: requiere evaluar ${sign.tipo === "dinamica" ? "el movimiento completo" : "la ubicación respecto al cuerpo"}.`;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guide-title" className="absolute inset-0 z-30 flex items-end justify-center bg-inverse-surface/55 p-2 backdrop-blur-[2px] sm:items-center sm:p-space-md">
      <div ref={box} className="pop flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex-1 overflow-y-auto p-space-md md:p-space-lg">
          <div className="grid gap-space-md md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <SignVideo sign={sign} variant="full" ratio="4 / 3" className="!rounded-2xl" />
              <p className="px-1 text-xs text-on-surface-variant">Avatar de referencia del equipo. <span className="text-outline">Validado por señante nativo: pendiente.</span></p>
            </div>
            <div className="flex min-w-0 flex-col gap-space-sm">
              <div className="flex flex-wrap items-center gap-space-xs">
                <span className="rounded-full bg-secondary-container px-space-sm py-0.5 font-label-sm text-label-sm uppercase text-on-secondary-fixed-variant">{TIPO[sign.tipo]}</span>
                {unitLabel && <span className="rounded-full bg-primary-fixed px-space-sm py-0.5 font-label-sm text-label-sm uppercase text-on-primary-fixed">{unitLabel}</span>}
              </div>
              <h2 id="guide-title" className="font-headline-lg text-headline-lg tracking-tight text-on-surface">{sign.glosa}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">{sign.significado}.</p>
              <ol className="grid gap-2 sm:grid-cols-2">
                {steps.map(s => (
                  <li key={s.n} className="flex gap-2 rounded-xl bg-surface-container-low p-space-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-container text-primary"><Icon name={s.icon} className="text-lg" /></span>
                    <div className="min-w-0"><h3 className="font-label-md text-label-md text-on-surface">{s.title}</h3><p className="text-xs leading-snug text-on-surface-variant">{s.text}</p></div>
                  </li>
                ))}
              </ol>
              {sign.erroresComunes.length > 0 && <div className="rounded-xl bg-tertiary-fixed/50 p-space-sm text-on-tertiary-fixed">
                <h3 className="flex items-center gap-1 font-label-md text-label-md"><Icon name="warning" className="text-base text-tertiary" /> Errores comunes</h3>
                <ul className="mt-1 list-disc pl-5 text-xs leading-snug">{sign.erroresComunes.map(e => <li key={e}>{e}.</li>)}</ul>
              </div>}
              <p className="flex gap-2 text-xs leading-snug text-on-surface-variant"><Icon name={evaluable ? "photo_camera" : "info"} className="shrink-0 text-base text-primary" />{mode}</p>
              {(prev || next) && <nav aria-label="Otras señas" className="flex flex-wrap gap-space-xs">
                {prev && <Link href={`/app/practica/${prev.id}`} className="rounded-full bg-surface-container px-space-md py-space-xs font-label-md text-label-md hover:bg-surface-container-high">← {prev.glosa}</Link>}
                {next && <Link href={`/app/practica/${next.id}`} className="rounded-full bg-surface-container px-space-md py-space-xs font-label-md text-label-md hover:bg-surface-container-high">{next.glosa} →</Link>}
              </nav>}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-space-sm border-t border-outline-variant/40 p-space-md sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-on-surface-variant"><Icon name="shield" className="mr-1 align-middle text-sm text-primary" />Tu video se procesa en tu dispositivo: <b className="text-on-surface">no se graba ni se envía</b>.</p>
          <button ref={start} onClick={onStart} className="btn-push-primary h-12 sm:min-w-[220px]"><Icon name="videocam" /> Empezar a practicar</button>
        </div>
      </div>
    </div>
  );
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 37) % 100}%`, delay: `${(i % 6) * 0.15}s`, color: ["#4977CD", "#EF746D", "#FEDA84", "#7BD3A3"][i % 4] }));

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
