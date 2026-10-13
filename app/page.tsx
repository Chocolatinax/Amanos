"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [source, setSource] = useState("directo");
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("utm_source");
    if (s) { setSource(s); try { localStorage.setItem("amanos.utm_source", s); } catch {} }
    else { try { setSource(localStorage.getItem("amanos.utm_source") ?? "directo"); } catch {} }
  }, []);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const list = JSON.parse(localStorage.getItem("amanos.waitlist") ?? "[]");
      list.push({ email, source, at: new Date().toISOString() });
      localStorage.setItem("amanos.waitlist", JSON.stringify(list));
    } catch {}
    setDone(true);
  };
  return (
    <main className="min-h-dvh">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 text-lg font-bold text-brand-600"><span className="text-2xl">✌🏻</span> Amanos</div>
        <Link href="/login" className="btn-ghost py-2">Entrar</Link>
      </nav>
      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">LESSA · Lengua de Señas Salvadoreña</span>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Dominá las 100 señas del uso diario <span className="text-brand-600">en 3 semanas</span>.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            La cámara verifica que cada seña te salga al 90% antes de avanzar. Aprendé a la hora que podás, sin esperar a que abra un ciclo.
          </p>
          <ul className="mt-6 space-y-2 text-slate-700">
            <li>✅ Lecciones y vocabulario completos, gratis</li>
            <li>📷 Corrección por cámara en tiempo real, $5/mes</li>
            <li>📈 Tu porcentaje exacto de avance en cada seña</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">Empezar hoy</Link>
            <a href="#waitlist" className="btn-ghost">Lista de espera</a>
          </div>
        </div>
        <div className="card">
          <div className="grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white">
            <div className="text-center">
              <div className="text-7xl">🤟</div>
              <div className="mt-3 text-sm opacity-90">Seña validada: <b>92%</b></div>
            </div>
          </div>
        </div>
      </section>
      <section id="waitlist" className="mx-auto max-w-5xl px-4 pb-20">
        <div className="card md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-2xl font-bold">Entrá a la lista de espera</h2>
            <p className="text-slate-600">Te avisamos cuando abramos el piloto. Canal: <span className="font-mono text-xs">{source}</span></p>
          </div>
          {done ? (
            <p className="mt-4 font-semibold text-green-700 md:mt-0">¡Listo! Te escribimos pronto.</p>
          ) : (
            <form onSubmit={submit} className="mt-4 flex gap-2 md:mt-0">
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 md:w-72" />
              <button className="btn-primary">Anotarme</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
