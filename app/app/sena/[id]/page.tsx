"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import SignVideo from "@/components/SignVideo";
import { useProgress } from "@/components/AppShell";
import { getSign, SIGNS } from "@/lib/signs";
import { markSeen } from "@/lib/progress";

const FREE_CAMERA_SIGNS = 3; // el plan gratis prueba la cámara con las primeras 3 señas

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sign = getSign(id);
  const [p, setP] = useProgress();
  useEffect(() => { if (sign) setP(markSeen(sign.id)); }, [sign, setP]);
  if (!sign) return <p>Seña no encontrada.</p>;
  if (!p) return null;

  const idx = SIGNS.findIndex(s => s.id === sign.id);
  const prev = SIGNS[idx - 1], next = SIGNS[idx + 1];
  const sp = p.signs[sign.id];
  const locked = p.plan !== "pago" && idx >= FREE_CAMERA_SIGNS && sign.id !== "hola"; // hola libre para la demo

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <Link href={`/app/unidad/${sign.unidadId}`}>← Unidad {sign.unidadId}</Link>
        <span>{idx + 1} / {SIGNS.length}</span>
      </div>
      <SignVideo sign={sign} />
      <div>
        <h1 className="text-3xl font-black">{sign.glosa} <span className="text-lg font-semibold text-slate-500">· {sign.significado}</span></h1>
        {sp?.mastered && <span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Dominada · mejor {sp.bestScore}%</span>}
      </div>
      <div className="card grid gap-3 text-sm md:grid-cols-3">
        <div><div className="font-semibold text-slate-500">Mano</div>{sign.descripcion.configuracionMano}</div>
        <div><div className="font-semibold text-slate-500">Ubicación</div>{sign.descripcion.ubicacion}</div>
        <div><div className="font-semibold text-slate-500">Orientación</div>{sign.descripcion.orientacion}</div>
      </div>
      {sign.erroresComunes.length > 0 && (
        <div className="card text-sm">
          <div className="font-semibold text-slate-500">Errores comunes</div>
          <ul className="mt-1 list-disc pl-5">{sign.erroresComunes.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => router.push(locked ? `/app/paywall?next=${sign.id}` : `/app/practica/${sign.id}`)} className="btn-primary">
          📷 Practicar con cámara {locked && "🔒"}
        </button>
        {prev && <Link href={`/app/sena/${prev.id}`} className="btn-ghost">← {prev.glosa}</Link>}
        {next && <Link href={`/app/sena/${next.id}`} className="btn-ghost">{next.glosa} →</Link>}
      </div>
      <p className="text-xs text-slate-400">Validado por señante nativo: pendiente.</p>
    </div>
  );
}
