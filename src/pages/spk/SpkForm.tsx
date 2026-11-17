import React, { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Calendar, AlertTriangle, ChevronUp, X } from 'lucide-react';
import { useStore } from '../../store/store';
import { Badge, Btn, Input, Select, toast, cx } from '../../ui/kit';
import { SPK_STATUS } from '../../domain/labels';
import { navigate } from '../../router';
import { NotFound } from '../Misc';
import { fpkCoverage, latest } from '../../domain/selectors';
import { SHIFTS } from '../../domain/fpk';
import { fmtDate, fmtRp, diffDays } from '../../domain/time';
import type { Shift, SpkType } from '../../domain/types';

type Line = { positionId: string; qty: number; shift: Shift; fpkLineId?: string };

// ---- Helper yang sama dengan form FPK (layout & perilaku disamakan) ----
const formatNumberWithDots = (num: number) => (num ? String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');

const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker(); } catch { /* browser lama */ }
};


const SectionTitle: React.FC<{ num: number; children: React.ReactNode }> = ({ num, children }) => (
  <h2 className="text-sm font-medium text-slate-900 mb-3">
    <span className="text-slate-400 font-normal">{num} ·</span> {children}
  </h2>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{children}</label>
);

const Divider = () => <div className="border-t border-slate-200 pt-5 mt-5" />;

/** Field tanggal: seluruh area bisa diklik untuk membuka kalender. */
const DateField: React.FC<{ value: string; placeholder: string; min?: string; onChange: (v: string) => void }> = ({ value, placeholder, min, onChange }) => (
  <div className="relative">
    <div className="h-10 w-full px-3 flex items-center justify-between text-sm bg-white border border-slate-300 rounded-lg pointer-events-none">
      <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>{value ? fmtDate(value) : placeholder}</span>
      <Calendar className="w-4 h-4 text-slate-400" />
    </div>
    <input type="date" value={value} min={min} onChange={e => onChange(e.target.value)} onClick={openPicker} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
  </div>
);

export const SpkFormPage: React.FC<{ reviseId?: string }> = ({ reviseId }) => {
  const { state, lookups, me, actions } = useStore();
  const old = reviseId ? lookups.spk.get(reviseId) : undefined;
  const qs = new URLSearchParams(window.location.search);
  const qsFpk = qs.get('fpk') ?? '';
  const qsProject = qs.get('project') ?? '';
  const qsParent = qs.get('induk') ?? '';
  // Lanjutkan draft: isian diambil dari draft yang tersimpan
  const qsDraft = qs.get('draft') ?? '';
  const draft = !reviseId && qsDraft ? state.spkDrafts.find(x => x.id === qsDraft && x.createdBy === me.id) : undefined;
  const d = draft?.input;

  const myClient = (cid: string) => {
    const c = lookups.client.get(cid);
    return !!c && (c.accountOwnerId === me.id || c.coOwnerIds.includes(me.id));
  };

  // Target FPK dari data project / URL
  const targetFpk = qsFpk
    ? lookups.fpk.get(qsFpk)
    : (qsProject ? state.fpks.find(f => latest(f).siteId === qsProject) : undefined);

  const fpks = state.fpks.filter(f =>
    (['disetujui', 'berjalan', 'tertutup_sebagian'].includes(f.status) || f.id === qsFpk || (targetFpk && f.id === targetFpk.id)) &&
    (myClient(latest(f).clientId) || (targetFpk && f.id === targetFpk.id))
  );

  const [fpkId, setFpkId] = useState(old?.fpkId ?? d?.fpkId ?? targetFpk?.id ?? '');
  // Klien dipilih dulu supaya FPK induk mudah dicari
  const initialFpk = lookups.fpk.get(old?.fpkId ?? d?.fpkId ?? targetFpk?.id ?? '');
  const [pickedClientId, setPickedClientId] = useState(initialFpk ? latest(initialFpk).clientId : (old?.clientId ?? ''));
  const [number, setNumber] = useState(old?.number ?? d?.number ?? '');
  const [parentSpkId, setParent] = useState(old?.parentSpkId ?? d?.parentSpkId ?? qsParent);
  const [effectiveDate, setEff] = useState(old?.effectiveDate ?? d?.effectiveDate ?? '');
  // Isi kontrak diketik dari dokumen SPK klien, bukan disalin dari FPK, supaya Finance bisa membandingkan.
  const [periodStart, setPS] = useState(old?.periodStart ?? d?.periodStart ?? '');
  const [periodEnd, setPE] = useState(old?.periodEnd ?? d?.periodEnd ?? '');
  const [monthlyValue, setValue] = useState(old?.monthlyValue ?? d?.monthlyValue ?? 0);
  const [lines, setLines] = useState<Line[]>(
    old?.lines.map(l => ({ positionId: l.positionId, qty: l.qty, shift: l.shift })) ??
    d?.lines.map(l => ({ positionId: l.positionId, qty: l.qty, shift: l.shift })) ??
    [{ positionId: '', qty: 1, shift: 'Pagi' }]
  );
  const [pdf, setPdf] = useState(d?.pdfName ?? '');
  const [err, setErr] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  if (reviseId && (!old || old.status !== 'perlu_revisi' || !myClient(old.clientId))) return <NotFound what="SPK yang perlu revisi" />;

  const f = lookups.fpk.get(fpkId);
  const fv = f ? latest(f) : undefined;
  // Jenis SPK tidak dipilih manual; ditentukan dari asal form (PRD: baru / addendum / perpanjangan)
  //  - dari tugas memo perpanjangan (?induk=) → perpanjangan
  //  - FPK induk berjenis perubahan → addendum atas SPK aktif di site itu
  //  - selain itu → baru
  const type: SpkType = old?.type ?? (qsParent ? 'perpanjangan' : f?.type === 'perubahan' ? 'addendum' : d?.type ?? 'baru');
  const autoParent = type === 'addendum' && fv
    ? [...state.spks].filter(x => x.siteId === fv.siteId && x.status === 'aktif').sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0]
    : undefined;
  const parentId = parentSpkId || autoParent?.id || '';
  const parentSpk = lookups.spk.get(parentId);
  // Perpanjangan: FPK dan klien mengikuti SPK induk.
  const noFpkRenewal = type === 'perpanjangan' && !!parentSpk;
  const clientId = fv ? fv.clientId : noFpkRenewal ? parentSpk!.clientId : '';
  // Site tidak diisi manual: 1 FPK = 1 site (perpanjangan mengikuti SPK induk)
  const siteId = noFpkRenewal ? parentSpk!.siteId : (fv?.siteId ?? old?.siteId ?? '');
  const site = lookups.site.get(siteId);
  const area = site ? lookups.area.get(site.areaId) : undefined;
  // Addendum menggantikan SPK induknya, jadi sisa kuota dihitung tanpa SPK induk.
  const cov = f ? fpkCoverage(f, type === 'addendum' && parentId ? state.spks.filter(x => x.id !== parentId) : state.spks, reviseId) : null;
  // Pilihan klien: klien yang punya FPK siap di-SPK-kan atau SPK aktif (untuk addendum/perpanjangan)
  const clientOptions = state.clients
    .filter(c => fpks.some(x => latest(x).clientId === c.id) || state.spks.some(s => s.clientId === c.id && s.status === 'aktif' && myClient(c.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const clientFpks = fpks.filter(x => latest(x).clientId === pickedClientId);
  // Perpanjangan boleh untuk SPK yang sudah berakhir (mis. site masih dijaga setelah SPK habis).
  const parents = state.spks.filter(s => (s.status === 'aktif' || (type === 'perpanjangan' && s.status === 'berakhir')) && (pickedClientId ? s.clientId === pickedClientId : myClient(s.clientId)));

  // SPK lain yang sudah terhubung ke FPK induk ini (mencegah input dobel)
  const siblingSpks = f ? state.spks.filter(x => x.fpkId === f.id && x.id !== reviseId) : [];
  const pendingSibling = siblingSpks.some(x => x.status === 'diinput');
  // Nomor SPK unik per klien: dicek langsung saat diketik
  const numberClientId = clientId || pickedClientId;
  const numberTaken = !!number.trim() && !!numberClientId && state.spks.some(x =>
    x.id !== reviseId && x.clientId === numberClientId && x.number.trim().toLowerCase() === number.trim().toLowerCase());

  // Baris FPK yang ditutup dicocokkan otomatis dari jabatan + shift
  const matchFor = (l: Line) => cov?.lines.find(c => c.line.positionId === l.positionId && c.line.shift === l.shift);
  const linesWithMatch = lines.map(l => ({ ...l, fpkLineId: noFpkRenewal ? undefined : matchFor(l)?.line.id }));

  const formInput = () => ({
    number, type, parentSpkId: parentId || undefined, fpkId: noFpkRenewal ? undefined : fpkId, siteId,
    periodStart, periodEnd, effectiveDate: effectiveDate || undefined, monthlyValue, lines: linesWithMatch, pdfName: pdf,
  });

  const submit = () => {
    const r = actions.inputSpk(formInput(), reviseId, draft?.id);
    if (!r.ok) return setErr(r.error);
    toast('SPK diinput, menunggu verifikasi Finance');
    navigate(`/spk/${r.id}`);
  };

  const saveDraft = () => {
    const r = actions.saveSpkDraft(formInput(), draft?.id);
    if (!r.ok) return setErr(r.error);
    toast('Draft SPK tersimpan');
    navigate('/spk?tab=draft');
  };

  const backTo = reviseId ? `/spk/${reviseId}` : (qsProject ? `/project/${qsProject}` : '/spk');

  // Tanggal diisi sesuai dokumen SPK (tanpa preset durasi)
  const onStart = (v: string) => setPS(v);
  const onEnd = (v: string) => setPE(v);

  const updateLine = (i: number, patch: Partial<Line>) => setLines(lines.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  // Ringkasan & checklist panel kanan
  const totalPersonnel = lines.reduce((n, l) => n + (l.qty || 0), 0);
  const remainingQuota = cov ? cov.lines.reduce((n, c) => n + Math.max(0, c.line.qty - c.covered), 0) : 0;
  // Nilai hanya bisa dibandingkan dengan FPK bila SPK ini mencakup seluruh personel FPK (bukan SPK sebagian)
  const fpkTotal = fv ? fv.lines.reduce((n, l) => n + l.qty, 0) : 0;
  const valueDiff = fv && type === 'baru' && monthlyValue > 0 && totalPersonnel === fpkTotal ? monthlyValue - fv.monthlyValue : 0;
  const checklist = [
    { num: 1, label: 'Dokumen induk', done: Boolean(pickedClientId && (fpkId || noFpkRenewal) && (type === 'baru' || parentId) && (type !== 'addendum' || effectiveDate)) },
    { num: 2, label: 'Isi SPK', done: Boolean(number.trim() && monthlyValue > 0 && periodStart && periodEnd && diffDays(periodStart, periodEnd) > 0) },
    { num: 3, label: 'Formasi personel', done: lines.length > 0 && lines.every(l => l.positionId && l.qty > 0) },
    { num: 4, label: 'Lampiran', done: Boolean(pdf) },
  ];
  const remaining = checklist.filter(c => !c.done).length;

  const goTo = (n: number) => {
    setSheetOpen(false);
    document.getElementById(`spk-section-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const summary = (
<div className="text-xs space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between gap-2">
                <span>Personel:</span>
                <span className="font-medium text-slate-800 text-right">
                  {totalPersonnel} orang{cov && !noFpkRenewal ? ` · sisa kuota FPK ${remainingQuota}` : ''}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Nilai / bln:</span>
                <span className="font-medium text-slate-800 text-right">{monthlyValue ? fmtRp(monthlyValue) : '–'}</span>
              </div>
              {valueDiff !== 0 && (
                <p className="text-amber-700 text-right">
                  {valueDiff > 0 ? 'Lebih' : 'Kurang'} {fmtRp(Math.abs(valueDiff))} dari FPK
                </p>
              )}
              <div className="flex justify-between gap-2">
                <span>Periode:</span>
                <span className="font-medium text-slate-800 text-right">{periodStart && periodEnd ? `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}` : '–'}</span>
              </div>
            </div>
  );

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-8 pt-4 sm:pt-7 pb-24">
      {/* Header */}
      <div className="mb-5 sm:mb-6 flex items-start sm:items-center gap-3">
        <button type="button" onClick={() => navigate(backTo)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0" aria-label="Kembali">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {reviseId ? `Revisi ${old!.number}` : draft ? 'Lanjutkan draft SPK' : 'Input SPK'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Isi sesuai dokumen SPK dari klien.</p>
        </div>
      </div>

      {old?.revisionReason && (
        <div className="mb-5 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3">
          <span className="font-semibold">Dikembalikan Finance:</span> {old.revisionReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-xs">
          {/* 1 · Dokumen induk */}
          <div>
            <span id="spk-section-1" className="block scroll-mt-24" /><SectionTitle num={1}>Dokumen induk</SectionTitle>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Klien</Label>
                  <Select
                    className="h-10 text-sm"
                    value={pickedClientId}
                    onChange={e => {
                      const cid = e.target.value;
                      setPickedClientId(cid);
                      // Kalau klien hanya punya satu FPK yang bisa di-SPK-kan, langsung terpilih
                      const opts = fpks.filter(x => latest(x).clientId === cid);
                      setFpkId(opts.length === 1 ? opts[0].id : '');
                      setParent('');
                    }}
                    disabled={!!reviseId}
                  >
                    <option value="">– Pilih klien –</option>
                    {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>FPK induk</Label>
                  <Select
                    className="h-10 text-sm"
                    value={noFpkRenewal ? '' : fpkId}
                    onChange={e => setFpkId(e.target.value)}
                    disabled={!!reviseId || noFpkRenewal || !pickedClientId}
                  >
                    <option value="">{noFpkRenewal ? 'Mengikuti SPK induk' : !pickedClientId ? 'Pilih klien terlebih dahulu' : '– Pilih site / FPK –'}</option>
                    {clientFpks.map(x => <option key={x.id} value={x.id}>{lookups.site.get(latest(x).siteId)?.name} · {x.number}</option>)}
                  </Select>
                  {site && (
                    <p className="text-[13px] text-slate-500 mt-1">
                      {site.name}{area ? ` · ${area.name}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* SPK yang sudah ada di FPK induk ini */}
              {f && !noFpkRenewal && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]">
                  {siblingSpks.length === 0 ? (
                    <p className="text-slate-500">Belum ada SPK untuk FPK ini.</p>
                  ) : (
                    <>
                      <p className="text-slate-500 mb-1.5">Sudah ada di FPK ini:</p>
                      <ul className="space-y-1">
                        {siblingSpks.map(x => (
                          <li key={x.id} className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-slate-800">{x.number}</span>
                            <Badge tone={SPK_STATUS[x.status].tone}>{SPK_STATUS[x.status].label}</Badge>
                            <span className="text-slate-500">{x.lines.reduce((n, l) => n + l.qty, 0)} orang</span>
                          </li>
                        ))}
                      </ul>
                      {pendingSibling && (
                        <p className="mt-2 text-amber-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Ada SPK yang masih dicek Finance. Pastikan ini bukan dokumen yang sama.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Jenis SPK ditentukan otomatis; hanya tampil bila bukan SPK baru */}
              {type !== 'baru' && (
                parentSpk ? (
                  <p className="text-[13px] text-slate-600">
                    <span className="font-semibold text-amber-700">{type === 'addendum' ? 'Addendum' : 'Perpanjangan'}</span>
                    {type === 'addendum' ? ' untuk ' : ' dari '}
                    <span className="font-mono text-slate-800">{parentSpk.number}</span>
                  </p>
                ) : (
                  <div className="md:w-1/2 md:pr-2">
                    <Label>SPK induk</Label>
                    <Select className="h-10 text-sm" value={parentSpkId} onChange={e => setParent(e.target.value)}>
                      <option value="">– Pilih SPK –</option>
                      {parents.map(x => <option key={x.id} value={x.id}>{x.number} · {lookups.site.get(x.siteId)?.name}</option>)}
                    </Select>
                  </div>
                )
              )}

              {type === 'addendum' && (
                <div className="md:w-1/2 md:pr-2">
                  <Label>Tanggal berlaku addendum</Label>
                  <DateField value={effectiveDate} placeholder="Pilih tanggal berlaku" onChange={setEff} />
                  <p className="text-[13px] text-slate-400 mt-1">Isi formasi lengkap setelah perubahan, bukan selisihnya.</p>
                </div>
              )}
            </div>
          </div>

          <Divider />

          {/* 2 · Isi SPK */}
          <div className="space-y-4">
            <span id="spk-section-2" className="block scroll-mt-24" /><SectionTitle num={2}>Isi SPK</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <Label>Nomor SPK</Label>
                <Input
                  className={cx('h-10 font-mono', numberTaken && 'border-rose-400 focus:ring-rose-200')}
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="Sesuai dokumen klien"
                />
                {numberTaken
                  ? <p className="text-[13px] text-rose-600 mt-1">Nomor ini sudah dipakai untuk klien ini.</p>
                  : <p className="text-[13px] text-slate-400 mt-1">Unik per klien.</p>}
              </div>
              <div>
                <Label>Nilai / bulan</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="h-10 pl-10 font-semibold text-slate-900 tabular-nums w-full"
                    placeholder="0"
                    value={formatNumberWithDots(monthlyValue)}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setValue(raw ? parseInt(raw, 10) : 0);
                    }}
                  />
                </div>
                <p className="text-[13px] text-slate-400 mt-1">sebelum PPN</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <Label>Tanggal mulai</Label>
                <DateField value={periodStart} placeholder="Pilih tanggal mulai" onChange={onStart} />
              </div>
              <div>
                <Label>Tanggal akhir</Label>
                <DateField value={periodEnd} placeholder="Pilih tanggal akhir" min={periodStart || undefined} onChange={onEnd} />
                <p className="text-[13px] text-slate-400 mt-1">
                  {periodStart && periodEnd && diffDays(periodStart, periodEnd) > 0
                    ? `Durasi: ${Math.round((diffDays(periodStart, periodEnd) + 1) / 30.417)} bulan (${diffDays(periodStart, periodEnd) + 1} hari)`
                    : '–'}
                </p>
              </div>
            </div>
          </div>

          <Divider />

          {/* 3 · Formasi personel */}
          <div className="space-y-3">
            <span id="spk-section-3" className="block scroll-mt-24" /><SectionTitle num={3}>Formasi personel</SectionTitle>
            <div className="hidden sm:grid grid-cols-[1fr_100px_120px_32px] gap-3 text-xs font-semibold text-slate-500 mb-1">
              <span>Jabatan</span>
              <span>Jumlah</span>
              <span>Shift</span>
              <span />
            </div>
            <div className="space-y-4">
              {lines.map((l, i) => {
                const m = matchFor(l);
                const left = m ? m.line.qty - m.covered : 0;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_32px] gap-3 items-center">
                      <Select className="h-10 text-sm" value={l.positionId} onChange={e => updateLine(i, { positionId: e.target.value })}>
                        <option value="">– Pilih jabatan –</option>
                        {state.positions.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                      <div className="flex items-center h-10 border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <button type="button" onClick={() => updateLine(i, { qty: Math.max(1, (l.qty || 1) - 1) })} className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 border-r border-slate-200 font-bold select-none" title="Kurangi">−</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-8 flex-1 h-full text-sm text-center tabular-nums font-semibold text-slate-800 focus:outline-none"
                          value={l.qty === 0 ? '' : l.qty}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            updateLine(i, { qty: raw ? parseInt(raw, 10) : 0 });
                          }}
                        />
                        <button type="button" onClick={() => updateLine(i, { qty: (l.qty || 0) + 1 })} className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 border-l border-slate-200 font-bold select-none" title="Tambah">+</button>
                      </div>
                      <Select className="h-10 text-sm" value={l.shift} onChange={e => updateLine(i, { shift: e.target.value as Shift })}>
                        {SHIFTS.map(s => <option key={s}>{s}</option>)}
                      </Select>
                      <div className="flex justify-center">
                        {lines.length > 1 && (
                          <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Hapus baris">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Keterangan kuota FPK yang ditutup (dicocokkan otomatis) */}
                    {cov && !noFpkRenewal && l.positionId && (
                      m ? (
                        <p className={cx('text-[13px]', l.qty > left ? 'text-amber-700' : 'text-slate-500')}>
                          Menutup kuota FPK: {lookups.position.get(l.positionId)?.name} {l.shift} · sisa {left}
                          {l.qty > left ? ` (melebihi ${l.qty - left})` : ''}
                        </p>
                      ) : (
                        <p className="text-[13px] text-amber-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Jabatan & shift ini tidak ada di FPK induk
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setLines([...lines, { positionId: '', qty: 1, shift: 'Pagi' }])}
              className="w-full h-10 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" /> Tambah jabatan
            </button>
          </div>

          <Divider />

          {/* 4 · Lampiran */}
          <div className="space-y-3">
            <span id="spk-section-4" className="block scroll-mt-24" /><SectionTitle num={4}>Lampiran</SectionTitle>
            <div className="space-y-2">
              <Label>PDF SPK</Label>
              {pdf ? (
                <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="truncate text-slate-700 font-medium">{pdf}</span>
                  <button type="button" onClick={() => setPdf('')} className="text-slate-400 hover:text-rose-600 p-0.5 ml-2" title="Hapus">✕</button>
                </div>
              ) : (
                <>
                  <label className="h-[100px] w-full border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-slate-600 cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Pilih file PDF SPK
                    <input type="file" accept=".pdf" className="hidden" onChange={e => { const n = e.target.files?.[0]?.name; if (n) setPdf(n); e.target.value = ''; }} />
                  </label>
                  {site && (
                    <button type="button" onClick={() => setPdf(`SPK_${site.code}_${new Date().getFullYear()}.pdf`)} className="text-xs text-slate-500 hover:text-indigo-600 underline">
                      Gunakan contoh file PDF
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Panel kanan: Siap dikirim? */}
        <aside className="hidden lg:block lg:sticky lg:top-[88px] lg:w-[300px]">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Siap dikirim?</h3>
            <div className="space-y-2">
              {checklist.map(c => (
                <button key={c.num} type="button" onClick={() => goTo(c.num)} className="w-full flex items-center gap-2 text-xs py-1 text-left hover:text-slate-950">
                  {c.done ? <span className="text-slate-900 font-bold">✓</span> : <span className="text-slate-300">○</span>}
                  <span className={c.done ? 'font-medium text-slate-900' : 'text-slate-500'}>{c.num} · {c.label}</span>
                </button>
              ))}
            </div>

            {summary}

            {err && <p className="text-xs text-rose-600">{err}</p>}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Btn type="button" className="w-full justify-center h-10 text-sm font-bold" onClick={submit}>
                Kirim ke verifikasi Finance
              </Btn>
              {!reviseId && (
                <Btn type="button" variant="secondary" className="w-full justify-center h-9 text-xs font-semibold" onClick={saveDraft}>
                  Simpan draft
                </Btn>
              )}
              {remaining > 0 && <p className="text-[13px] text-center text-slate-400">{remaining} hal belum lengkap</p>}
            </div>
            <p className="text-[12px] text-slate-400 text-center">Diverifikasi Finance → SPK aktif</p>
          </div>
        </aside>
      </div>

      {/* Mobile: bar bawah tetap (sama dengan form FPK) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <button type="button" onClick={() => setSheetOpen(o => !o)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>{remaining === 0 ? 'Siap dikirim' : `${remaining} hal belum lengkap`}</span>
            <ChevronUp className={cx('w-4 h-4 transition-transform', sheetOpen && 'rotate-180')} />
          </button>
          <div className="flex items-center gap-2">
            {!reviseId && <Btn size="sm" variant="secondary" onClick={saveDraft}>Simpan draft</Btn>}
            <Btn size="sm" onClick={submit}>Kirim</Btn>
          </div>
        </div>
      </div>

      {/* Mobile: lembar ringkasan */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 flex flex-col justify-end" onClick={() => setSheetOpen(false)}>
          <div className="bg-white rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Kelengkapan SPK</h3>
              <button onClick={() => setSheetOpen(false)} className="p-1 text-slate-400" aria-label="Tutup"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1">
              {checklist.map(c => (
                <button key={c.num} type="button" onClick={() => goTo(c.num)} className="w-full flex items-center justify-between text-xs py-2 border-b border-slate-100">
                  <span className="flex items-center gap-2">
                    {c.done ? <span className="text-slate-900 font-bold">✓</span> : <span className="text-slate-300">○</span>}
                    <span className={c.done ? 'font-semibold text-slate-900' : 'text-slate-500'}>{c.num} · {c.label}</span>
                  </span>
                  <span className="text-indigo-600 font-medium">Buka</span>
                </button>
              ))}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">{summary}</div>
            {err && <p className="text-xs text-rose-600">{err}</p>}
            <p className="text-[12px] text-slate-400 text-center">Diverifikasi Finance → SPK aktif</p>
          </div>
        </div>
      )}

      {/* Error kirim di mobile tampil juga di atas bar */}
      {err && !sheetOpen && (
        <div className="lg:hidden fixed bottom-[64px] left-4 right-4 z-40 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>
      )}
    </div>
  );
};
