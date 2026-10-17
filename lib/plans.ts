import type { PlanId } from "./types";
// Catálogo de planes. Con API, GET /plans devuelve lo mismo (api/src/subscription/plans.ts); esto es el respaldo local.
export const PLANS: { id: PlanId; nombre: string; precio: number; intervalo: "mes" | "año"; etiqueta?: string }[] = [
  { id: "mensual", nombre: "Mensual", precio: 5, intervalo: "mes" },
  { id: "anual", nombre: "Anual", precio: 45, intervalo: "año", etiqueta: "Ahorrá 25%" },
];
export const getPlan = (id: PlanId) => PLANS.find(p => p.id === id)!;
