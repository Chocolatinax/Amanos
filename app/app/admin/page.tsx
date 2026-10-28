"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { api, hasBackend } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { SIGNS } from '@/lib/signs';
import { loadReference } from '@/lib/reference-source';
import type { AdminUsers, SignEdit, SignSettings } from '@/lib/content';

const referenceIds = ['a', 'b', 'c', 'adios', 'tu', 'hola', 'buenas-tardes', 'gracias', 'mucho-gusto'];
const fieldStyle = 'mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary';
function editFor(id: string, rows: SignSettings[]): SignEdit {
  const base = SIGNS.find(s => s.id === id)!, row = rows.find(s => s.id === id);
  return { revision: row?.revision ?? 0, enabled: row?.enabled ?? true, evaluationEnabled: row?.evaluationEnabled ?? true,
    glosa: row?.glosa ?? base.glosa, significado: row?.significado ?? base.significado,
    configuracionMano: row?.configuracionMano ?? base.descripcion.configuracionMano,
    ubicacion: row?.ubicacion ?? base.descripcion.ubicacion, orientacion: row?.orientacion ?? base.descripcion.orientacion };
}
export default function AdminPage() {
  const { refresh } = useCatalog();
  const [rows, setRows] = useState<SignSettings[]>([]), [access, setAccess] = useState(false), [loading, setLoading] = useState(true);
  const [id, setId] = useState('a'), [form, setForm] = useState<SignEdit>(editFor('a', []));
  const [tab, setTab] = useState<'signs' | 'users'>('signs'), [users, setUsers] = useState<AdminUsers | null>(null);
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const token = () => { const t = getToken(); if (!t) throw new Error('Volvé a iniciar sesión con Google.'); return t; };
  useEffect(() => {
    let current = true;
    if (!hasBackend()) { setError('El panel necesita la API conectada y una sesión de Google.'); setLoading(false); return; }
    Promise.resolve().then(() => api.adminSigns(token())).then(r => { if (current) { setRows(r.signs); setForm(editFor('a', r.signs)); setAccess(true); } })
      .catch(e => { if (current) setError(e.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  const task = async (fn: () => Promise<void>) => { setBusy(true); setError(''); setMessage(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); } };
  const adopt = async (row: SignSettings) => {
    const next = [...rows.filter(r => r.id !== row.id), row]; setRows(next); setForm(editFor(id, next)); setDirty(false);
    await refresh();
  };
  const change = <K extends keyof SignEdit>(key: K, value: SignEdit[K]) => { setForm(f => ({ ...f, [key]: value })); setDirty(true); setMessage(''); };
  const select = (next: string) => { setId(next); setForm(editFor(next, rows)); setDirty(false); setError(''); setMessage(''); };
  const loadUsers = (page: number) => task(async () => { setUsers(await api.adminUsers(token(), page)); });
  const download = () => task(async () => {
    const data = await loadReference(id); if (!data) throw new Error('Todavía no hay referencia para esta seña.');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${id}-referencia.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  if (loading) return <div className="p-6" role="status">Verificando acceso de administrador…</div>;
  if (!access) return <div className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-bold">Administración</h1><p role="alert" className="my-4">{error} Usá la cuenta de Google administradora; el acceso de demo no tiene permisos.</p><Link href="/login" className="text-primary underline">Ir al inicio de sesión</Link></div>;
  const row = rows.find(r => r.id === id);
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
    <div><span className="text-sm font-semibold text-primary">SOLO ADMINISTRACIÓN</span><h1 className="mt-1 text-3xl font-bold">Tu espacio de Amanos</h1><p className="mt-2 text-on-surface-variant">Actualizá las lecciones y sus referencias. Los cambios guardados se aplican a toda la app.</p></div>
    <div className="flex gap-2" aria-label="Secciones de administración">
      <button disabled={busy} onClick={() => setTab('signs')} className={`rounded-xl px-5 py-3 font-semibold ${tab === 'signs' ? 'bg-primary-container text-on-primary' : 'bg-surface-container'}`}>Señas y cámara</button>
      <button disabled={busy} onClick={() => { setTab('users'); void loadUsers(1); }} className={`rounded-xl px-5 py-3 font-semibold ${tab === 'users' ? 'bg-primary-container text-on-primary' : 'bg-surface-container'}`}>Usuarios</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-secondary-container p-4 text-on-secondary-container">{message}</p>}
    {tab === 'signs' ? <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="rounded-2xl bg-surface-container-lowest p-4"><label className="font-semibold" htmlFor="admin-sign">Elegí una seña</label><select id="admin-sign" value={id} disabled={busy || dirty} onChange={e => select(e.target.value)} className={fieldStyle}>{SIGNS.map(s => <option key={s.id} value={s.id}>{rows.find(r => r.id === s.id)?.glosa ?? s.glosa}{rows.find(r => r.id === s.id)?.enabled === false ? ' · Oculta' : ''}</option>)}</select><p className="mt-3 text-sm text-on-surface-variant">{dirty ? 'Guardá o descartá los cambios antes de elegir otra seña.' : 'Las señas ocultas dejan de aparecer en las lecciones y en la práctica.'}</p></aside>
      <div className="space-y-6">
        <form className="space-y-5 rounded-2xl bg-surface-container-lowest p-5 md:p-6" onSubmit={e => { e.preventDefault(); void task(async () => { await adopt(await api.adminSave(token(), id, form)); setMessage('Cambios guardados. Ya están disponibles en las lecciones.'); }); }}>
          <h2 className="text-xl font-bold">Contenido de la seña</h2>
          <div className="grid gap-4 sm:grid-cols-2">{(['glosa', 'significado'] as const).map(key => <label key={key} className="font-medium">{key === 'glosa' ? 'Nombre' : 'Significado'}<input required maxLength={key === 'glosa' ? 80 : 200} className={fieldStyle} disabled={busy} value={form[key]} onChange={e => change(key, e.target.value)} /></label>)}</div>
          {([['configuracionMano','Forma de la mano'], ['ubicacion','Ubicación'], ['orientacion','Orientación']] as const).map(([key,label]) => <label key={key} className="block font-medium">{label}<textarea required rows={2} maxLength={600} className={fieldStyle} disabled={busy} value={form[key]} onChange={e => change(key, e.target.value)} /></label>)}
          <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-5 w-5" disabled={busy} checked={form.enabled} onChange={e => change('enabled', e.target.checked)} />Mostrar esta seña</label>
          <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-5 w-5" disabled={busy || !referenceIds.includes(id)} checked={form.evaluationEnabled && referenceIds.includes(id)} onChange={e => change('evaluationEnabled', e.target.checked)} />Permitir la evaluación con cámara{!referenceIds.includes(id) && ' · Evaluador pendiente'}</label>
          <div className="flex flex-wrap items-center gap-3"><button disabled={busy || !dirty} className="btn-push-primary disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar cambios'}</button>{dirty && <button type="button" disabled={busy} onClick={() => select(id)} className="min-h-11 px-3 text-on-surface-variant">Descartar cambios</button>}<Link className="py-3 text-primary underline" href={`/app/sena/${id}`}>Ver lección</Link></div>
        </form>
        <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-5 md:p-6"><h2 className="text-xl font-bold">Referencia de cámara</h2><p className="text-sm text-on-surface-variant">{row?.hasReference ? 'Usando una referencia cargada desde este panel.' : 'Usando la referencia original, cuando esté disponible.'} {['gracias','mucho-gusto'].includes(id) && 'Esta seña solo comprueba el movimiento visible; no califica los dedos ocultos.'}</p>
          <div className="flex flex-wrap gap-3"><button disabled={busy || !referenceIds.includes(id)} onClick={download} className="min-h-11 rounded-xl bg-primary-fixed px-4 font-semibold text-primary disabled:opacity-50"><Icon name="download" className="mr-1 align-middle" />Descargar JSON</button>
          <label className="flex min-h-11 cursor-pointer items-center rounded-xl bg-surface-container px-4 font-semibold">Cargar JSON<input aria-label="Cargar referencia JSON" className="ml-3 max-w-[180px] text-sm" type="file" accept=".json,application/json" disabled={busy || dirty || !referenceIds.includes(id)} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; void task(async () => { if (file.size > 900000) throw new Error('El archivo supera 900 KB.'); const data = JSON.parse(await file.text()); await adopt(await api.adminReference(token(), id, form.revision, data)); setMessage('Referencia guardada. Abrí la práctica para comprobarla con cámara.'); }); }} /></label>
          {row?.hasReference && <button disabled={busy || dirty} onClick={() => void task(async () => { await adopt(await api.adminReference(token(), id, form.revision, null)); setMessage('Se restauró la referencia original.'); })} className="min-h-11 px-3 text-primary underline">Restaurar original</button>}</div>
          <p className="text-xs text-on-surface-variant">Subí el JSON de evaluación de esta misma seña. Los movimientos del avatar usan un formato diferente.</p>
        </section>
      </div>
    </div> : <section className="rounded-2xl bg-surface-container-lowest p-5"><h2 className="text-xl font-bold">Usuarios registrados {users ? `(${users.total})` : ''}</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Nombre</th><th className="p-3">Correo</th><th className="p-3">Registro</th></tr></thead><tbody>{users?.users.map(u => <tr key={u.id} className="border-b border-outline-variant/40"><td className="p-3">{u.name}</td><td className="p-3">{u.email}</td><td className="whitespace-nowrap p-3">{new Date(u.createdAt).toLocaleDateString('es-SV')}</td></tr>)}</tbody></table></div>{!users && <p role="status" className="py-4">{busy ? 'Cargando usuarios…' : 'No se pudo cargar la lista.'}</p>}{users && <div className="mt-4 flex items-center justify-between gap-3"><button disabled={busy || users.page <= 1} onClick={() => void loadUsers(users.page - 1)} className="min-h-11 px-3 text-primary disabled:opacity-40">Anterior</button><span>Página {users.page} de {Math.max(1, Math.ceil(users.total / users.pageSize))}</span><button disabled={busy || users.page * users.pageSize >= users.total} onClick={() => void loadUsers(users.page + 1)} className="min-h-11 px-3 text-primary disabled:opacity-40">Siguiente</button></div>}</section>}
  </div>;
}
