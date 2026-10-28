"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCatalog } from "@/lib/catalog";

// La seña y sus instrucciones ahora se ven en una ventana encima de la cámara.
export default function SignPage() {
  const { getSign } = useCatalog();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sign = getSign(id);
  useEffect(() => { if (sign) router.replace(`/app/practica/${sign.id}`); }, [sign?.id, router]);

  if (!sign) return <div className="mx-auto max-w-3xl p-margin"><p>Seña no encontrada.</p><Link href="/app" className="text-primary underline">Volver al panel</Link></div>;
  return <p role="status" className="p-margin text-center text-on-surface-variant">Abriendo la cámara…</p>;
}
