"use client";
import type { Sign } from "@/lib/signs";
import Icon from "./Icon";

/** Avatar reference shared by lessons, practice and dashboard cards. */
export default function SignVideo({ sign, className = "", variant = "mini", ratio = "4 / 3" }: {
  sign: Sign; className?: string; variant?: "mini" | "full";
  ratio?: string; fit?: "contain" | "cover";
}) {
  const available = ["a", "b", "c", "adios", "tu", "gracias", "hola", "buenas-tardes"].includes(sign.id);
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-inverse-surface ${className}`} style={ratio === "none" ? undefined : { aspectRatio: ratio }}>
      {available ? <iframe key={sign.id} src={`/avatar/viewer.html?sign=${sign.id}&compact=${variant === "mini" ? "1" : "0"}&v=hands-5`}
        title={`Avatar: ${sign.glosa}`} className="absolute inset-0 h-full w-full border-0" />
        : <div className="grid h-full min-h-40 w-full place-items-center bg-gradient-to-br from-primary-container to-primary text-on-primary">
          <div className="px-4 text-center">
            <Icon name="sign_language" className="text-4xl opacity-80" />
            <div className="mt-1 font-headline-sm">{sign.glosa}</div>
            <div className="mt-1 font-body-sm opacity-80">Avatar en preparación</div>
          </div>
        </div>}
    </div>
  );
}
