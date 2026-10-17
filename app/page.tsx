"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import Icon from "@/components/Icon";
import PublicHeader from "@/components/PublicHeader";
import ScoreRing from "@/components/ScoreRing";
import { api, hasBackend } from "@/lib/api";
import { SIGNS, UNITS } from "@/lib/signs";
import { useApp } from "@/lib/store";

const FEATURES = [
  { icon: "visibility", tone: "bg-primary-fixed text-primary", title: "Aprendé viendo", text: "Videos en bucle de cada seña, con la forma de la mano, la orientación, el movimiento y la ubicación explicados paso a paso.", href: "#vocabulario", cta: "Ver el vocabulario" },
  { icon: "photo_camera", tone: "bg-secondary-container text-secondary", title: "Practicá con tu cámara", text: "La cámara detecta tu mano y la compara con referencias para decirte si tu seña se parece. Todo ocurre en tu navegador.", href: "/login", cta: "Probar la cámara" },
  { icon: "local_fire_department", tone: "bg-tertiary-fixed text-tertiary", title: "Seguí tu progreso", text: "Racha diaria, XP y una meta chiquita cada día para que practicar se vuelva costumbre.", href: "/login", cta: "Ver mi ruta" },
];
const STEPS = [
  { t: "Observá la seña", d: "Mirala en el video y fijate en la mano, la orientación y el movimiento." },
  { t: "Repetila frente a la cámara", d: "El modelo compara tu mano con las referencias y te guía en vivo." },
  { t: "Sumá XP y racha", d: "Cada seña dominada suma puntos y mantiene tu fuego encendido." },
];

export default function Landing() {
  const { user, ready } = useApp();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("directo");

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("utm_source");
    if (s) { setSource(s); try { localStorage.setItem("amanos.utm_source", s); } catch {} }
    else { try { setSource(localStorage.getItem("amanos.utm_source") ?? "directo"); } catch {} }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const list = JSON.parse(localStorage.getItem("amanos.waitlist") ?? "[]");
      list.push({ email, source, at: new Date().toISOString() });
      localStorage.setItem("amanos.waitlist", JSON.stringify(list));
    } catch {}
    if (hasBackend()) { try { await api.waitlist(email, source); } catch {} }
    setDone(true); setBusy(false);
  };

  const cta = user ? "/app" : "/login";

  return (
    <div className="min-h-dvh bg-background">
      {ready && user ? <AppHeader /> : <PublicHeader />}
      <main className="w-full pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-primary-fixed-dim/30 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-space-xl px-margin py-space-xl md:px-margin-tablet lg:grid-cols-2 lg:px-margin-desktop">
            <div>
              <span className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-space-xs font-label-sm text-label-sm uppercase tracking-wide text-on-primary-fixed"><Icon name="translate" className="text-base" /> Aprendé LESSA a tu ritmo</span>
              <h1 className="mt-space-md font-headline-xl-mobile text-headline-xl-mobile tracking-tight md:font-headline-xl md:text-headline-xl">Dominá la Lengua de Señas Salvadoreña <span className="text-primary-container">seña por seña</span></h1>
              <p className="mt-space-md max-w-xl font-body-lg text-body-lg text-on-surface-variant">Aprendé con videos y practicá frente a tu cámara, sin penas y sin grabaciones. Empezá hoy mismo.</p>
              <div className="mt-space-lg flex flex-wrap gap-space-sm">
                <Link href={cta} className="btn-push-primary h-14 !px-space-xl">{user ? "Ir a mi ruta" : "Empezar gratis"} <Icon name="arrow_forward" className="text-lg" /></Link>
                <a href="#como" className="btn-push-ghost h-14"><Icon name="play_circle" className="text-lg text-primary" /> Cómo funciona</a>
              </div>
              <p className="mt-space-md flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant"><Icon name="lock" className="text-base text-secondary" /> Privacidad total: tu video no sale de tu navegador ni viaja a ningún servidor.</p>
              <div className="mt-space-lg">
                <p className="mb-space-xs font-label-sm text-label-sm uppercase text-on-surface-variant">Señas de la demo</p>
                <div className="flex flex-wrap gap-space-xs">{SIGNS.map(s => <span key={s.id} className="rounded-full bg-surface-container px-space-sm py-1 font-label-sm text-label-sm text-on-surface-variant">{s.glosa}</span>)}</div>
              </div>
            </div>

            {/* Maqueta del detector (ejemplo ilustrativo) */}
            <div className="relative mx-auto w-full max-w-lg">
              <div className="overflow-hidden rounded-3xl bg-surface-container-lowest p-space-sm shadow-2xl ring-1 ring-primary-fixed">
                <div className="flex items-center justify-between px-space-sm py-space-xs">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-error/80" /><i className="h-2.5 w-2.5 rounded-full bg-tertiary-fixed-dim" /><i className="h-2.5 w-2.5 rounded-full bg-secondary-fixed-dim" /></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Práctica con cámara · ejemplo</span>
                </div>
                <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-inverse-surface via-primary to-primary-container">
                  <Icon name="front_hand" fill className="text-[150px] text-white/25" />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" aria-hidden>
                    <g stroke="#9ec0ff" strokeWidth="3" fill="#fff"><path d="M200 240 L185 180 L172 130 M200 240 L215 175 L222 115 M200 240 L240 190 L262 150 M200 240 L160 200 L128 190" fill="none" />{[[200,240],[185,180],[172,130],[215,175],[222,115],[240,190],[262,150],[160,200],[128,190]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" />)}</g>
                  </svg>
                  <div className="absolute bottom-space-sm left-space-sm flex items-center gap-space-sm rounded-2xl bg-surface-container-lowest/95 p-space-sm shadow-lg">
                    <ScoreRing value={94} size={64} stroke={6} label="" />
                    <div><div className="flex items-center gap-1 font-label-sm text-label-sm uppercase text-secondary"><Icon name="verified" fill className="text-base" /> ¡Excelente!</div><div className="font-body-sm text-body-sm text-on-surface-variant">Sostenela un segundo</div></div>
                  </div>
                </div>
              </div>
              <p className="mt-space-sm text-center font-body-sm text-xs text-outline">Ilustración de ejemplo de la pantalla de práctica.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
          <div className="flex flex-col items-start justify-between gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-space-md">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-tertiary-fixed text-tertiary"><Icon name="emoji_objects" fill /></span>
              <div><h2 className="font-label-lg text-label-lg">¿Primera vez aprendiendo LESSA?</h2><p className="font-body-sm text-body-sm text-on-surface-variant">La Lengua de Señas Salvadoreña tiene su propia gramática e identidad, distinta del español hablado.</p></div>
            </div>
            <Link href={user ? "/app/sena/a" : "/login"} className="inline-flex shrink-0 items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-space-sm font-label-md text-label-md text-primary hover:brightness-95">Explorar la primera lección <Icon name="arrow_forward" className="text-lg" /></Link>
          </div>
        </section>

        {/* Features */}
        <section id="como" className="mx-auto max-w-7xl scroll-mt-20 px-margin py-space-xl md:px-margin-tablet lg:px-margin-desktop">
          <div className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-space-md py-space-xs font-label-sm text-label-sm text-primary"><Icon name="auto_awesome" className="text-base" /> Así funciona</span>
            <h2 className="mt-space-sm font-headline-lg text-headline-lg md:font-headline-xl md:text-headline-xl">Diseñado para que se te quede de verdad</h2>
            <p className="mx-auto mt-space-xs max-w-2xl font-body-lg text-body-lg text-on-surface-variant">Olvidate de los PDF estáticos. Con Amanos aprendés haciendo, viendo y corrigiéndote en segundos.</p>
          </div>
          <div className="mt-space-lg grid gap-gutter md:grid-cols-3">
            {FEATURES.map(f => (
              <article key={f.title} className="card-surface flex flex-col gap-space-sm p-space-lg">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${f.tone}`}><Icon name={f.icon} fill /></span>
                <h3 className="font-headline-sm text-headline-sm">{f.title}</h3>
                <p className="flex-1 font-body-md text-body-md text-on-surface-variant">{f.text}</p>
                {f.href.startsWith("#") ? <a href={f.href} className="inline-flex items-center gap-1 font-label-md text-label-md text-primary">{f.cta} <Icon name="arrow_forward" className="text-base" /></a>
                  : <Link href={user ? "/app" : f.href} className="inline-flex items-center gap-1 font-label-md text-label-md text-primary">{f.cta} <Icon name="arrow_forward" className="text-base" /></Link>}
              </article>
            ))}
          </div>
        </section>

        <section className="bg-surface-container-low py-space-xl">
          <div className="mx-auto grid max-w-7xl items-center gap-space-xl px-margin md:px-margin-tablet lg:grid-cols-2 lg:px-margin-desktop">
            <div>
              <span className="rounded-full bg-primary-fixed px-space-sm py-1 font-label-sm text-label-sm uppercase text-on-primary-fixed">Micro-aprendizaje salvadoreño</span>
              <h2 className="mt-space-sm font-headline-lg text-headline-lg md:font-headline-xl md:text-headline-xl">Pocos minutos al día, en el bus, la oficina o tu casa</h2>
              <p className="mt-space-sm font-body-lg text-body-lg text-on-surface-variant">Sin gramáticas complicadas para empezar. Aprendé señas útiles para comunicarte con compañeros de trabajo, clientes o familiares sordos.</p>
              <ol className="mt-space-lg flex flex-col gap-space-md">
                {STEPS.map((s, i) => (
                  <li key={s.t} className="flex items-start gap-space-sm"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary-container font-label-sm text-label-sm text-secondary">{i + 1}</span><div><div className="font-label-lg text-label-lg">{s.t}</div><div className="font-body-sm text-body-sm text-on-surface-variant">{s.d}</div></div></li>
                ))}
              </ol>
            </div>
            <div id="vocabulario" className="scroll-mt-20 card-surface p-space-lg">
              <h3 className="font-headline-sm text-headline-sm">Vocabulario de esta versión</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{SIGNS.length} señas en {UNITS.length} unidades. Seguimos sumando más con personas que dominan LESSA.</p>
              <div className="mt-space-md grid gap-space-sm">
                {UNITS.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-low px-space-md py-space-sm">
                    <div><div className="font-label-md text-label-md">{u.nombre}</div><div className="font-body-sm text-xs text-on-surface-variant">{u.descripcion}</div></div>
                    <span className="font-label-sm text-label-sm text-primary">{u.signIds.length} {u.signIds.length === 1 ? "seña" : "señas"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Lista de espera */}
        <section id="waitlist" className="mx-auto max-w-5xl scroll-mt-20 px-margin py-space-xl md:px-margin-tablet">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-container p-space-lg text-center text-on-primary shadow-2xl md:p-space-xl">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-space-md py-space-xs font-label-sm text-label-sm"><Icon name="celebration" className="text-base" /> Cupos tempranos gratuitos</span>
            <h2 className="mx-auto mt-space-sm max-w-2xl font-headline-lg text-headline-lg md:font-headline-xl md:text-headline-xl">Entrá a la lista de espera</h2>
            <p className="mx-auto mt-space-xs max-w-xl font-body-lg text-body-lg opacity-90">Dejá tu correo y te avisamos cuando abramos el piloto, con invitaciones a probar las señas nuevas primero.</p>
            {done ? (
              <p role="status" className="mt-space-lg inline-flex items-center gap-space-xs rounded-full bg-white/15 px-space-lg py-space-sm font-label-lg text-label-lg"><Icon name="check_circle" fill /> ¡Listo! Te escribimos pronto.</p>
            ) : (
              <form onSubmit={submit} className="mx-auto mt-space-lg flex max-w-xl flex-col gap-space-sm sm:flex-row">
                <label className="relative flex-1"><span className="sr-only">Correo electrónico</span>
                  <Icon name="mail" className="pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-outline" />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ingresá tu correo…" className="h-14 w-full rounded-full bg-surface-container-lowest pl-14 pr-space-md font-body-md text-body-md text-on-surface outline-none" />
                </label>
                <button disabled={busy} className="btn-push-success h-14 rounded-full">{busy ? "Enviando…" : "Anotarme"}</button>
              </form>
            )}
            <p className="mt-space-md flex flex-wrap items-center justify-center gap-space-md font-body-sm text-body-sm opacity-90"><span className="flex items-center gap-1"><Icon name="verified_user" className="text-base" /> Gratis</span><span className="flex items-center gap-1"><Icon name="block" className="text-base" /> Cero spam</span><span className="flex items-center gap-1"><Icon name="logout" className="text-base" /> Cancelás cuando querás</span></p>
            <p className="mt-space-xs font-label-sm text-xs opacity-70">Canal: {source}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
