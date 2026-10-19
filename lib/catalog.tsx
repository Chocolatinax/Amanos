"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, hasBackend } from './api';
import { SIGNS, UNITS, type Sign, type Unit } from './signs';
import type { SignSettings } from './content';

export function mergeCatalog(settings: SignSettings[]) {
    const all = SIGNS.map(sign => {
      const row = settings.find(s => s.id === sign.id);
      return { ...sign, glosa: row?.glosa ?? sign.glosa, significado: row?.significado ?? sign.significado,
        descripcion: { configuracionMano: row?.configuracionMano ?? sign.descripcion.configuracionMano, ubicacion: row?.ubicacion ?? sign.descripcion.ubicacion, orientacion: row?.orientacion ?? sign.descripcion.orientacion } };
    });
    const signs = all.filter(s => settings.find(r => r.id === s.id)?.enabled !== false);
    const units = UNITS.map(u => ({ ...u, signIds: u.signIds.filter(id => signs.some(s => s.id === id)) })).filter(u => u.signIds.length);
  return { signs, units };
}

type Catalog = { signs: Sign[]; units: Unit[]; settings: SignSettings[]; ready: boolean; refresh: () => Promise<void>; getSign: (id: string) => Sign | undefined; getUnit: (id: string) => Unit | undefined; evaluationEnabled: (id: string) => boolean };
const Context = createContext<Catalog | null>(null);
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SignSettings[]>([]);
  const [ready, setReady] = useState(!hasBackend());
  const refresh = useCallback(async () => {
    if (!hasBackend()) { setReady(true); return; }
    try {
      const result = await api.content();
      setSettings(result.signs);
      try { localStorage.setItem('amanos.catalog.v1', JSON.stringify(result.signs)); } catch {}
    } finally { setReady(true); }
  }, []);
  useEffect(() => {
    try { const cached = JSON.parse(localStorage.getItem('amanos.catalog.v1') || '[]'); if (hasBackend() && Array.isArray(cached)) setSettings(cached); } catch {}
    void refresh().catch(() => {});
    const onFocus = () => void refresh().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  const value = useMemo<Catalog>(() => {
    const { signs, units } = mergeCatalog(settings);
    return { signs, units, settings, ready, refresh, getSign: id => signs.find(s => s.id === id), getUnit: id => units.find(u => u.id === id), evaluationEnabled: id => settings.find(s => s.id === id)?.evaluationEnabled !== false };
  }, [settings, ready, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCatalog() { const c = useContext(Context); if (!c) throw new Error('Falta CatalogProvider'); return c; }
