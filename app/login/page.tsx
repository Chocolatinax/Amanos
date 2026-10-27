"use client";
import BrandSymbol from "@/components/BrandLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { GOOGLE_CLIENT_ID, hasBackend } from "@/lib/api";
import { useApp } from "@/lib/store";

declare global { interface Window { google?: any } }

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);

export default function Login() {
  const router = useRouter();
  const { ready, user, loginEmail, loginGoogle } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gbtn = useRef<HTMLDivElement>(null);
  const realGoogle = Boolean(GOOGLE_CLIENT_ID) && hasBackend();

  useEffect(() => { if (ready && user) router.replace("/app"); }, [ready, user, router]);

  // Botón oficial de Google (solo si hay client id y API).
  useEffect(() => {
    if (!realGoogle) return;
    const init = () => {
      if (!window.google || !gbtn.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (r: { credential: string }) => {
          setBusy(true); setError(null);
          try { await loginGoogle(r.credential); router.replace("/app"); }
          catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar sesión con Google."); setBusy(false); }
        },
      });
      window.google.accounts.id.renderButton(gbtn.current, { theme: "outline", size: "large", width: 360, text: "continue_with", shape: "pill", locale: "es" });
    };
    if (window.google) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true; s.onload = init;
    document.head.appendChild(s);
  }, [realGoogle, loginGoogle, router]);

  const go = async (mail: string, name?: string) => {
    setBusy(true); setError(null);
    try { await loginEmail(mail, name); router.replace("/app"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar sesión."); setBusy(false); }
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (email.trim()) go(email); };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-margin py-space-xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-fixed/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-secondary-container/30 blur-3xl" />
      <div className="card-surface relative w-full max-w-[34rem] rounded-3xl p-space-lg shadow-[0_16px_48px_-12px_rgba(73,119,205,0.18)] md:p-space-xl">
        <div className="flex flex-col items-center text-center">
          <BrandSymbol className="h-16 w-auto" />
          <span className="mt-space-md inline-flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-space-xs font-label-sm text-label-sm uppercase text-primary"><span className="h-2 w-2 rounded-full bg-coral" /> Amanos LESSA</span>
          <h1 className="mt-space-md font-headline-lg text-headline-lg text-on-surface md:font-headline-xl md:text-headline-xl-mobile">¡Qué bueno verte de nuevo!</h1>
          <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">Ingresá a tu cuenta para continuar con tu racha de señas.</p>
        </div>

        <div className="mt-space-lg flex items-center gap-space-md rounded-xl bg-surface-container-low p-space-md">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-tertiary-fixed text-tertiary"><Icon name="local_fire_department" fill /></div>
          <div className="flex-1"><div className="font-label-md text-label-md">Mantené tu racha</div><div className="font-body-sm text-body-sm text-on-surface-variant">Practicá una seña al día y subí de nivel.</div></div>
        </div>

        <div className="mt-space-lg flex flex-col gap-space-md">
          {realGoogle ? (
            <div className="flex min-h-[44px] justify-center"><div ref={gbtn} /></div>
          ) : (
            <button onClick={() => go("demo@amanos.app", "Chris")} disabled={busy} className="flex h-12 w-full items-center justify-center gap-space-sm rounded-full bg-surface-container-lowest font-label-lg text-label-lg shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] ring-1 ring-outline-variant/50 transition-all hover:bg-surface-container-low active:scale-[0.99] disabled:opacity-60">
              <GoogleG /> Continuar con Google
            </button>
          )}
          {!realGoogle && <p className="-mt-space-sm text-center font-body-sm text-xs text-outline">Modo demo: el acceso con Google es simulado.</p>}

          <div className="flex items-center gap-space-md"><span className="h-px flex-1 bg-outline-variant/50" /><span className="font-body-sm text-body-sm text-on-surface-variant">o ingresá con tu correo</span><span className="h-px flex-1 bg-outline-variant/50" /></div>

          <form onSubmit={submit} className="flex flex-col gap-space-sm">
            <label htmlFor="email" className="font-label-md text-label-md">Correo electrónico</label>
            <div className="relative">
              <Icon name="mail" className="pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu.nombre@ejemplo.sv"
                className="h-14 w-full rounded-lg bg-surface-container-low pl-14 pr-space-md font-body-md text-body-md outline-none ring-2 ring-transparent transition focus:ring-primary-container" />
            </div>
            <button disabled={busy} className="btn-push-primary mt-space-xs h-14 w-full">{busy ? "Entrando…" : "Continuar con correo"} {!busy && <Icon name="arrow_forward" />}</button>
          </form>
          {error && <p role="alert" className="rounded-lg bg-error-container px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">{error}</p>}

          <div className="flex gap-space-sm rounded-xl bg-surface-container-low p-space-md">
            <Icon name="shield" className="text-primary" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">Al continuar, aceptás nuestros términos. Respetamos tu privacidad: <b className="text-on-surface">el video de tu cámara se procesa en tu dispositivo y no se graba ni se comparte.</b></p>
          </div>
        </div>

        <div className="mt-space-lg flex items-center justify-between font-label-md text-label-md">
          <Link href="/" className="inline-flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface"><Icon name="arrow_back" className="text-lg" /> Volver al inicio</Link>
          <button onClick={() => document.getElementById("email")?.focus()} className="text-primary hover:underline">Crear cuenta gratis</button>
        </div>
      </div>
    </main>
  );
}
